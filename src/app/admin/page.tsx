'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/lib/types';
import { USER_ROLES } from '@/lib/constants';
import Link from 'next/link';
import { Upload, Plus } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const sessionId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_id='))
        ?.split('=')[1];

      if (!sessionId) {
        router.push('/');
        return;
      }

      // Get current user
      const { data: userData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!userData || userData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setUser(userData);

      // Get all employees
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (employeesData) {
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">관리자 권한이 필요합니다</p>
      </div>
    );
  }

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.includes(searchTerm) ||
      emp.email.includes(searchTerm) ||
      emp.employee_number.includes(searchTerm)
  );

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">관리자 패널</h1>
        <p className="text-gray-600">구성원 정보 및 평가 데이터 관리</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          href="/admin/upload"
          className="flex items-center space-x-4 p-6 bg-secondary bg-opacity-10 border-2 border-secondary rounded-lg hover:bg-opacity-20 transition"
        >
          <Upload className="text-secondary" size={32} />
          <div>
            <h3 className="font-bold text-primary">자체평가 업로드</h3>
            <p className="text-sm text-gray-600">Excel 파일에서 데이터 일괄 업로드</p>
          </div>
        </Link>

        <button
          onClick={() => {
            const newEmail = prompt('새 사용자 이메일:');
            if (newEmail) {
              // Handle new user creation
            }
          }}
          className="flex items-center space-x-4 p-6 bg-light border-2 border-gray-200 rounded-lg hover:border-secondary transition"
        >
          <Plus className="text-gray-400" size={32} />
          <div className="text-left">
            <h3 className="font-bold text-primary">새 구성원 추가</h3>
            <p className="text-sm text-gray-600">새 구성원 정보 등록</p>
          </div>
        </button>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-primary mb-4">구성원 목록</h2>
          <input
            type="text"
            placeholder="이름, 이메일 또는 사원번호로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  이름
                </th>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  이메일
                </th>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  부서
                </th>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  역할
                </th>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  평가 대상
                </th>
                <th className="text-left px-6 py-3 font-semibold text-gray-700">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-gray-200 hover:bg-light transition"
                >
                  <td className="px-6 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-600">{emp.title}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{emp.email}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {emp.department}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className="px-3 py-1 bg-secondary bg-opacity-10 text-secondary rounded-full text-xs font-medium">
                      {USER_ROLES[emp.role] || emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {emp.is_evaluated ? (
                      <span className="text-success">예</span>
                    ) : (
                      <span className="text-gray-500">아니오</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <button className="text-secondary hover:text-primary transition">
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">검색 결과가 없습니다</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">전체 구성원</p>
          <p className="text-3xl font-bold text-primary">{employees.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">평가 대상</p>
          <p className="text-3xl font-bold text-secondary">
            {employees.filter((e) => e.is_evaluated).length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">평가자</p>
          <p className="text-3xl font-bold text-success">
            {employees.filter((e) =>
              ['first_evaluator', 'second_evaluator', 'ceo'].includes(e.role)
            ).length}
          </p>
        </div>
      </div>
    </div>
  );
}
