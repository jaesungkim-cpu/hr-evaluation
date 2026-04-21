export type UserRole = 'employee' | 'first_evaluator' | 'second_evaluator' | 'ceo' | 'admin';
export type GroupType = '팀원' | '팀장급';
export type EvaluationType = 'first' | 'second' | 'ceo';
export type EvaluationStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';
export type OrgLevel = 'company' | '본부' | '실' | '팀';
export type EvalStatus = 'self' | 'first' | 'second' | 'ceo' | 'completed';

export interface Organization {
  id: string;
  name: string;
  parent_id: string | null;
  level: OrgLevel;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  employee_number: string;
  email: string;
  department: string | null;
  team: string | null;
  position: string | null;
  title: string | null;
  group_type: GroupType;
  is_evaluated: boolean;
  role: UserRole;
  org_id: string | null;
  first_evaluator_id: string | null;
  second_evaluator_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvaluationPeriod {
  id: string;
  name: string;
  year: number;
  status: EvalStatus;
  self_start_date: string | null;
  self_end_date: string | null;
  first_start_date: string | null;
  first_end_date: string | null;
  second_start_date: string | null;
  second_end_date: string | null;
  ceo_start_date: string | null;
  ceo_end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SelfAssessment {
  id: string;
  employee_id: string;
  period_id: string;
  content_json: Record<string, any>;
  file_url: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  evaluatee_id: string;
  evaluator_id: string;
  period_id: string;
  eval_type: EvaluationType;
  status: EvaluationStatus;
  performance_scores: Record<string, number> | null;
  competency_scores: Record<string, number> | null;
  performance_total: number | null;
  competency_total: number | null;
  composite_score: number | null;
  grade: Grade | null;
  comment: string | null;
  improvement_plan: string | null;
  created_at: string;
  updated_at: string;
}

export interface GradeRatio {
  id: string;
  group_type: GroupType;
  grade: Grade;
  target_ratio: number;
  created_at: string;
}

export interface PerformanceScores {
  delivery: number;
  quality: number;
  efficiency: number;
}

export interface CompetencyScores {
  leadership: number;
  growth: number;
  ethics: number;
}

export interface AuthSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId: string;
}

export interface EvaluationData {
  performanceScores: PerformanceScores;
  competencyScores: CompetencyScores;
  comment: string;
  improvementPlan: string;
}

export interface GradeDistribution {
  group_type: GroupType;
  department: string;
  gradeCount: Record<Grade, number>;
  total: number;
}
