import {
  PerformanceScores,
  CompetencyScores,
  Grade,
  Employee,
} from './types';

export function calculatePerformanceScore(scores: PerformanceScores): number {
  if (!scores.delivery || !scores.quality || !scores.efficiency) {
    return 0;
  }
  const weighted =
    (scores.delivery * 35 + scores.quality * 35 + scores.efficiency * 30) / 7;
  return Math.round(weighted * 100) / 100;
}

export function calculateCompetencyScore(scores: CompetencyScores): number {
  if (!scores.leadership || !scores.growth || !scores.ethics) {
    return 0;
  }
  const weighted =
    (scores.leadership * 35 + scores.growth * 35 + scores.ethics * 30) / 7;
  return Math.round(weighted * 100) / 100;
}

export function calculateCompositeScore(
  performanceScore: number,
  competencyScore: number
): number {
  const composite = performanceScore * 0.7 + competencyScore * 0.3;
  return Math.round(composite * 100) / 100;
}

export function assignGrade(compositeScore: number): Grade {
  if (compositeScore >= 6.5) return 'S';
  if (compositeScore >= 5.8) return 'A';
  if (compositeScore >= 4.5) return 'B';
  if (compositeScore >= 3.0) return 'C';
  return 'D';
}

export function getGradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    'S': '#ef4444',
    'A': '#f59e0b',
    'B': '#3b82f6',
    'C': '#8b5cf6',
    'D': '#6b7280',
  };
  return colors[grade];
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function hashPassword(password: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const crypto = require('crypto');
  const newHash = crypto.createHash('sha256').update(password).digest('hex');
  return newHash === hash;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getFullName(
  employee: Employee & { evaluator?: Employee }
): string {
  return employee.name;
}

export function isValidCompositeScore(score: number | null | undefined): boolean {
  return typeof score === 'number' && score > 0;
}

export function canModifyEvaluation(
  role: string,
  evaluationType: string,
  status: string
): boolean {
  if (status === 'approved' || status === 'rejected') {
    return false;
  }

  if (evaluationType === 'first' && role === 'first_evaluator') {
    return true;
  }

  if (evaluationType === 'second' && role === 'second_evaluator') {
    return true;
  }

  if (evaluationType === 'ceo' && role === 'ceo') {
    return true;
  }

  return false;
}

export function getEvaluationStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    'first': '1차 평가',
    'second': '2차 평가',
    'ceo': 'CEO 승인',
  };
  return labels[stage] || '미정';
}

export function parseExcelDate(excelDate: string | number): Date {
  if (typeof excelDate === 'number') {
    const d = new Date((excelDate - 25569) * 86400 * 1000);
    return d;
  }
  return new Date(excelDate);
}

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  data: Record<string, any>[]
): void {
  const XLSX = require('xlsx');

  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function getDepartmentFromOrgId(orgId: string | null): string {
  return '부서명';
}

export function getPermissionLevel(role: string): number {
  const levels: Record<string, number> = {
    'employee': 1,
    'first_evaluator': 2,
    'second_evaluator': 3,
    'ceo': 4,
    'admin': 5,
  };
  return levels[role] || 0;
}

export function canAccessPage(userRole: string, requiredRole: string): boolean {
  const userLevel = getPermissionLevel(userRole);
  const requiredLevel = getPermissionLevel(requiredRole);
  return userLevel >= requiredLevel;
}

export function getEvaluationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'first': '1차 평가 (팀장)',
    'second': '2차 평가 (본부장)',
    'ceo': 'CEO 승인',
  };
  return labels[type] || '평가';
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '-';
  }
  return num.toFixed(2);
}

export function parseJSONSafely(json: string | object | null): Record<string, any> {
  if (!json) return {};
  if (typeof json === 'object') return json;
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function getDaysSince(date: Date | string): number {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: Date | string): boolean {
  return getDaysSince(dueDate) > 0;
}

export function getProgressPercentage(
  current: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}
