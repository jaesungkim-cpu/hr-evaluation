-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  level VARCHAR(50) NOT NULL CHECK (level IN ('company', '본부', '실', '팀')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255),
  team VARCHAR(255),
  position VARCHAR(100),
  title VARCHAR(100),
  group_type VARCHAR(50) NOT NULL DEFAULT '팀원' CHECK (group_type IN ('팀원', '팀장급')),
  is_evaluated BOOLEAN DEFAULT true,
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'first_evaluator', 'second_evaluator', 'ceo', 'admin')),
  org_id UUID REFERENCES organizations(id),
  first_evaluator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  second_evaluator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  password_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evaluation Periods table
CREATE TABLE evaluation_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'self' CHECK (status IN ('self', 'first', 'second', 'ceo', 'completed')),
  self_start_date TIMESTAMP WITH TIME ZONE,
  self_end_date TIMESTAMP WITH TIME ZONE,
  first_start_date TIMESTAMP WITH TIME ZONE,
  first_end_date TIMESTAMP WITH TIME ZONE,
  second_start_date TIMESTAMP WITH TIME ZONE,
  second_end_date TIMESTAMP WITH TIME ZONE,
  ceo_start_date TIMESTAMP WITH TIME ZONE,
  ceo_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Self Assessments table
CREATE TABLE self_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  content_json JSONB NOT NULL DEFAULT '{}',
  file_url VARCHAR(500),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, period_id)
);

-- Evaluations table
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluatee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  eval_type VARCHAR(50) NOT NULL CHECK (eval_type IN ('first', 'second', 'ceo')),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  performance_scores JSONB,
  competency_scores JSONB,
  performance_total DECIMAL(5, 2),
  competency_total DECIMAL(5, 2),
  composite_score DECIMAL(5, 2),
  grade VARCHAR(1) CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  comment TEXT,
  improvement_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(evaluatee_id, evaluator_id, period_id, eval_type)
);

-- Grade Ratios table
CREATE TABLE grade_ratios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('팀원', '팀장급')),
  grade VARCHAR(1) NOT NULL CHECK (grade IN ('S', 'A', 'B', 'C', 'D')),
  target_ratio DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_type, grade)
);

-- Create indexes
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_org_id ON employees(org_id);
CREATE INDEX idx_employees_first_evaluator ON employees(first_evaluator_id);
CREATE INDEX idx_employees_second_evaluator ON employees(second_evaluator_id);
CREATE INDEX idx_self_assessments_employee ON self_assessments(employee_id);
CREATE INDEX idx_self_assessments_period ON self_assessments(period_id);
CREATE INDEX idx_evaluations_evaluatee ON evaluations(evaluatee_id);
CREATE INDEX idx_evaluations_evaluator ON evaluations(evaluator_id);
CREATE INDEX idx_evaluations_period ON evaluations(period_id);
CREATE INDEX idx_evaluations_type_status ON evaluations(eval_type, status);

-- Insert default grade ratios
INSERT INTO grade_ratios (group_type, grade, target_ratio) VALUES
('팀원', 'S', 10.00),
('팀원', 'A', 20.00),
('팀원', 'B', 50.00),
('팀원', 'C', 15.00),
('팀원', 'D', 5.00),
('팀장급', 'S', 10.00),
('팀장급', 'A', 20.00),
('팀장급', 'B', 50.00),
('팀장급', 'C', 15.00),
('팀장급', 'D', 5.00);

-- Insert sample organizations
INSERT INTO organizations (name, level, parent_id) VALUES
('비버웍스', 'company', NULL);

INSERT INTO organizations (name, level, parent_id) VALUES
('영업1본부', '본부', (SELECT id FROM organizations WHERE name = '비버웍스')),
('영업2본부', '본부', (SELECT id FROM organizations WHERE name = '비버웍스')),
('Digital본부', '본부', (SELECT id FROM organizations WHERE name = '비버웍스')),
('운영본부', '본부', (SELECT id FROM organizations WHERE name = '비버웍스'));

-- Insert sample employees (CEO and sample evaluators and evaluatees)
INSERT INTO employees (name, employee_number, email, department, team, position, title, group_type, is_evaluated, role, org_id) VALUES
('김대표', '001', 'ceo@beaverworks.com', '경영진', '경영진', '대표이사', '대표이사', '팀장급', false, 'ceo', (SELECT id FROM organizations WHERE name = '비버웍스')),
('박본부장1', '002', 'vp1@beaverworks.com', '영업1본부', '본부', '본부장', '본부장', '팀장급', false, 'second_evaluator', (SELECT id FROM organizations WHERE name = '영업1본부')),
('이본부장2', '003', 'vp2@beaverworks.com', '영업2본부', '본부', '본부장', '본부장', '팀장급', false, 'second_evaluator', (SELECT id FROM organizations WHERE name = '영업2본부')),
('정본부장3', '004', 'vp3@beaverworks.com', 'Digital본부', '본부', '본부장', '본부장', '팀장급', false, 'second_evaluator', (SELECT id FROM organizations WHERE name = 'Digital본부')),
('최본부장4', '005', 'vp4@beaverworks.com', '운영본부', '본부', '본부장', '본부장', '팀장급', false, 'second_evaluator', (SELECT id FROM organizations WHERE name = '운영본부')),
('홍팀장1', '006', 'team1@beaverworks.com', '영업1본부', '영업팀', '팀장', '팀장', '팀장급', false, 'first_evaluator', (SELECT id FROM organizations WHERE name = '영업1본부')),
('강팀장2', '007', 'team2@beaverworks.com', '영업2본부', '마케팅팀', '팀장', '팀장', '팀장급', false, 'first_evaluator', (SELECT id FROM organizations WHERE name = '영업2본부')),
('유센터장', '008', 'center@beaverworks.com', 'Digital본부', 'IT팀', '센터장', '센터장', '팀장급', false, 'first_evaluator', (SELECT id FROM organizations WHERE name = 'Digital본부')),
('윤실장', '009', 'office@beaverworks.com', '운영본부', '사무팀', '실장', '실장', '팀장급', false, 'first_evaluator', (SELECT id FROM organizations WHERE name = '운영본부')),
('인사담당', '010', 'admin@beaverworks.com', '운영본부', '인사팀', '담당', '담당', '팀원', false, 'admin', (SELECT id FROM organizations WHERE name = '운영본부'));

-- Insert sample evaluated employees (팀원 group)
INSERT INTO employees (name, employee_number, email, department, team, position, title, group_type, is_evaluated, role, org_id, first_evaluator_id, second_evaluator_id)
SELECT
  '김사원' || CAST((n) AS VARCHAR),
  LPAD(CAST(100 + n AS VARCHAR), 3, '0'),
  'emp' || CAST(n AS VARCHAR) || '@beaverworks.com',
  '영업1본부',
  '영업팀',
  '사원',
  '사원',
  '팀원',
  true,
  'employee',
  (SELECT id FROM organizations WHERE name = '영업1본부'),
  (SELECT id FROM employees WHERE email = 'team1@beaverworks.com'),
  (SELECT id FROM employees WHERE email = 'vp1@beaverworks.com')
FROM GENERATE_SERIES(1, 15) AS t(n);

-- Insert evaluation period
INSERT INTO evaluation_periods (name, year, status) VALUES
('2026년 1차 인사평가', 2026, 'first');

-- Row Level Security Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Employees RLS
CREATE POLICY "Enable read access for all authenticated users" ON employees
  FOR SELECT USING (true);

-- Self Assessments RLS
CREATE POLICY "Enable read for self assessment owners" ON self_assessments
  FOR SELECT USING (true);

-- Evaluations RLS
CREATE POLICY "Enable read for evaluators and evaluatees" ON evaluations
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for evaluators" ON evaluations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for evaluators" ON evaluations
  FOR UPDATE USING (true);
