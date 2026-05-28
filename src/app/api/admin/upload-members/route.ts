import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
    const supabase = getSupabase();
    const { data: userData } = await supabase.from('employees').select('role').eq('id', sessionId).single();
    if (!userData || userData.role !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as Record<string, any>[];
    const rows = allRows.slice(1);
    if (rows.length === 0) return NextResponse.json({ error: '업로드할 데이터가 없습니다' }, { status: 400 });
    const nameField = String(rows[0]['name'] ?? '').trim();
    const isSwapped = /^\d{6,}$/.test(nameField);
    const warning = isSwapped ? '이름/사번 컬럼이 바뀐 것을 감지하여 자동 교정했습니다.' : '';
    const str = (v: any): string => (v == null ? '' : String(v)).trim();
    const strOrNull = (v: any): string | null => { const s = str(v); return s === '' || s === '-' ? null : s; };
    const employees = rows
      .filter(r => r['email'] != null && str(r['email']) !== '')
      .map(r => ({
        name: isSwapped ? str(r['employee_number']) : str(r['name']),
        employee_number: isSwapped ? str(r['name']) : str(r['employee_number']),
        email: str(r['email']).toLowerCase(),
        department: strOrNull(r['division']) || strOrNull(r['department']),
        team: strOrNull(r['team']),
        position: strOrNull(r['position']),
        title: strOrNull(r['title']),
        group_type: (['팀원','팀장급'].includes(str(r['group_type'])) ? str(r['group_type']) : '팀원') as '팀원'|'팀장급',
        role: ['employee','first_evaluator','second_evaluator','ceo','admin'].includes(str(r['role'])) ? str(r['role']) : 'employee',
        is_evaluated: r['is_evaluated'] === false || str(r['is_evaluated']).toUpperCase() === 'FALSE' ? false : true,
      }))
      .filter(e => e.name && e.employee_number && e.email);
    if (employees.length === 0) return NextResponse.json({ error: '유효한 데이터가 없습니다.' }, { status: 400 });
    const { error: upsertError } = await supabase.from('employees').upsert(employees, { onConflict: 'email' });
    if (upsertError) return NextResponse.json({ error: `업로드 오류: ${upsertError.message}` }, { status: 500 });
    return NextResponse.json({ success: true, count: employees.length, message: `${employees.length}명의 구성원 정보가 업데이트되었습니다.`, warning: warning || undefined });
  } catch (err) {
    console.error('Excel upload error:', err);
    return NextResponse.json({ error: '파일 처리 중 오류가 발생했습니다' }, { status: 500 });
  }
}
