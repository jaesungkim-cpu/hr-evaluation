import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodId, exportType } = body;

    if (!periodId || !exportType) {
      return NextResponse.json(
        { error: '필수 파라미터가 없습니다' },
        { status: 400 }
      );
    }

    // Get evaluation data
    const { data: evaluations, error } = await supabaseServer
      .from('evaluations')
      .select(`
        *,
        evaluatee:employees(name, employee_number, email, department, title),
        evaluator:employees(name)
      `)
      .eq('period_id', periodId)
      .eq('status', 'submitted');

    if (error) {
      throw error;
    }

    if (exportType === 'summary') {
      // Create summary export
      const data = evaluations?.map((e: any) => ({
        사원명: e.evaluatee?.name,
        사원번호: e.evaluatee?.employee_number,
        부서: e.evaluatee?.department,
        직급: e.evaluatee?.title,
        '1차평가자': e.evaluator?.name,
        '성과평가점수': e.performance_total?.toFixed(2),
        '역량평가점수': e.competency_total?.toFixed(2),
        '종합점수': e.composite_score?.toFixed(2),
        등급: e.grade,
      })) || [];

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '평가 현황');

      // Generate file
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="evaluation_summary.xlsx"',
        },
      });
    }

    return NextResponse.json(
      { error: '지원하지 않는 내보내기 형식입니다' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: '내보내기 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
