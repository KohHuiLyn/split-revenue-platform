-- Split Revenue Platform - PostgreSQL Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    oauth_id VARCHAR(255) UNIQUE,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    wallet_private_key_encrypted VARCHAR(512) NOT NULL, -- encrypted server-side
    display_name VARCHAR(255),
    profile_picture_url VARCHAR(500),
    bio TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_email_sent_at TIMESTAMP,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_or_oauth CHECK (email IS NOT NULL OR oauth_id IS NOT NULL)
);

CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_oauth_id ON users(oauth_id);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    on_chain_id BIGINT UNIQUE, -- References the Smart Contract project_id
    creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url VARCHAR(500),
    price_usdc_micro BIGINT NOT NULL DEFAULT 0, -- Price in micro-units (e.g., 99.99 USD = 9999_000000)
    price_display_usd NUMERIC(10, 2) GENERATED ALWAYS AS (price_usdc_micro::NUMERIC / 1000000) STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_positive_price CHECK (price_usdc_micro >= 0)
);

CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_on_chain_id ON projects(on_chain_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);

-- Project collaborators (team members)
CREATE TABLE project_collaborators (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    collaborator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'contributor', -- 'creator', 'contributor', 'editor'
    status VARCHAR(50) NOT NULL DEFAULT 'invited', -- 'invited', 'accepted', 'removed'
    split_percentage INT DEFAULT 0, -- 0-100, will be validated against active split config
    joined_at TIMESTAMP,
    removed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, collaborator_id),
    CONSTRAINT check_valid_percentage CHECK (split_percentage >= 0 AND split_percentage <= 100)
);

CREATE INDEX idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_collaborator_id ON project_collaborators(collaborator_id);
CREATE INDEX idx_project_collaborators_status ON project_collaborators(status);

-- Split configurations (versioned, tracks history)
CREATE TABLE split_configs (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    on_chain_config_version BIGINT NOT NULL, -- Version from smart contract
    config_data JSONB NOT NULL, -- Stores {collaborators: [...], percentages: [...]}
    is_active BOOLEAN DEFAULT TRUE,
    created_by_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_split_configs_project_id ON split_configs(project_id);
CREATE INDEX idx_split_configs_is_active ON split_configs(is_active);

-- Split config approvals (tracks multi-sig approval)
CREATE TABLE split_config_approvals (
    id SERIAL PRIMARY KEY,
    split_config_id INT NOT NULL REFERENCES split_configs(id) ON DELETE CASCADE,
    collaborator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(split_config_id, collaborator_id)
);

CREATE INDEX idx_split_config_approvals_split_config_id ON split_config_approvals(split_config_id);
CREATE INDEX idx_split_config_approvals_collaborator_id ON split_config_approvals(collaborator_id);

-- Customers table (tracks who bought from projects)
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_email ON customers(email);

-- Purchases table
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount_usdc_micro BIGINT NOT NULL, -- Amount in micro-units
    amount_display_usd NUMERIC(10, 2) GENERATED ALWAYS AS (amount_usdc_micro::NUMERIC / 1000000) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    payment_method VARCHAR(50), -- 'credit_card', 'usdc', 'etc'
    external_stripe_payment_id VARCHAR(255), -- For Stripe integration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_project_id ON purchases(project_id);
CREATE INDEX idx_purchases_customer_id ON purchases(customer_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);

-- Payout batches table (tracks batched payouts to save gas)
CREATE TABLE payout_batches (
    id SERIAL PRIMARY KEY,
    on_chain_batch_id BIGINT UNIQUE, -- References the Smart Contract batch_id
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    total_amount_usdc_micro BIGINT NOT NULL,
    total_amount_display_usd NUMERIC(10, 2) GENERATED ALWAYS AS (total_amount_usdc_micro::NUMERIC / 1000000) STORED,
    num_recipients INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'executed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

CREATE INDEX idx_payout_batches_project_id ON payout_batches(project_id);
CREATE INDEX idx_payout_batches_status ON payout_batches(status);
CREATE INDEX idx_payout_batches_created_at ON payout_batches(created_at);

-- Payout history (individual payouts to collaborators)
CREATE TABLE payout_history (
    id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL REFERENCES payout_batches(id) ON DELETE CASCADE,
    on_chain_record_id BIGINT UNIQUE, -- References payout_registry record_id
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    recipient_id INT NOT NULL REFERENCES users(id),
    amount_usdc_micro BIGINT NOT NULL,
    amount_display_usd NUMERIC(10, 2) GENERATED ALWAYS AS (amount_usdc_micro::NUMERIC / 1000000) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
    on_chain_tx_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payout_history_batch_id ON payout_history(batch_id);
CREATE INDEX idx_payout_history_recipient_id ON payout_history(recipient_id);
CREATE INDEX idx_payout_history_project_id ON payout_history(project_id);
CREATE INDEX idx_payout_history_status ON payout_history(status);

-- Split configuration change proposals
CREATE TABLE split_config_proposals (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    proposed_by_id INT NOT NULL REFERENCES users(id),
    new_config_data JSONB NOT NULL, -- {collaborators: [...], percentages: [...]}
    reason VARCHAR(255), -- e.g., "collaborator_left", "rebalance_request"
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by_id INT REFERENCES users(id)
);

CREATE INDEX idx_split_config_proposals_project_id ON split_config_proposals(project_id);
CREATE INDEX idx_split_config_proposals_status ON split_config_proposals(status);

-- Collaborator invitations
CREATE TABLE invitations (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inviter_id INT NOT NULL REFERENCES users(id),
    invitee_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    token VARCHAR(255) UNIQUE NOT NULL, -- For email link
    token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP
);

CREATE INDEX idx_invitations_project_id ON invitations(project_id);
CREATE INDEX idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_token ON invitations(token);

-- Audit log for important actions
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'create_project', 'update_split', 'process_payout', etc
    entity_type VARCHAR(50), -- 'project', 'split_config', 'payout', etc
    entity_id INT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
