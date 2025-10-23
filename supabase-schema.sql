-- Enable RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  first_savings DECIMAL DEFAULT 0,
  current_savings DECIMAL DEFAULT 0,
  client_type TEXT DEFAULT 'BES',
  policy_type TEXT,
  policy_start_date DATE,
  policy_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE savings_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  amount DECIMAL NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_records INTEGER NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_preview TEXT NOT NULL,
  recipients INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES communication_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_clients_owner_id ON clients(owner_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_birth_date ON clients(birth_date);
CREATE INDEX idx_savings_snapshots_client_id ON savings_snapshots(client_id);
CREATE INDEX idx_uploads_owner_id ON uploads(owner_id);
CREATE INDEX idx_email_logs_owner_id ON email_logs(owner_id);
CREATE INDEX idx_communication_campaigns_owner_id ON communication_campaigns(owner_id);
CREATE INDEX idx_communication_campaigns_scheduled_at ON communication_campaigns(scheduled_at);
CREATE INDEX idx_communication_recipients_campaign_id ON communication_recipients(campaign_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own clients" ON clients FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own snapshots" ON savings_snapshots FOR ALL 
USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_id AND clients.owner_id = auth.uid()));

CREATE POLICY "Users can manage own uploads" ON uploads FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own email logs" ON email_logs FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own email templates" ON email_templates FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own campaigns" ON communication_campaigns FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Users can manage own recipients" ON communication_recipients FOR ALL 
USING (EXISTS (SELECT 1 FROM communication_campaigns WHERE communication_campaigns.id = campaign_id AND communication_campaigns.owner_id = auth.uid()));

-- Insert demo user
INSERT INTO users (email, name, password_hash) VALUES 
('demo@pensioncrm.test', 'Demo Agent', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
