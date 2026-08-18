import React from 'react';
import { AttendanceStatus, Gender, RankInfo, Student } from '../types';
import { StudentAvatar } from './StudentAvatar';

interface AttendanceCheckModalProps {
  students: Student[];
  statuses: Record<string, AttendanceStatus>;
  lessonDateKey: string;
  getRank: (pts: number, gender: Gender) => RankInfo;
  onSetStatus: (studentId: string, status: AttendanceStatus) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const statusStyles: Record<AttendanceStatus, string> = {
  present: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  late: 'border-amber-300 bg-amber-50 text-amber-700',
  absent: 'border-rose-300 bg-rose-50 text-rose-700'
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Có mặt',
  late: 'Muộn',
  absent: 'Vắng'
};

export const AttendanceCheckModal: React.FC<AttendanceCheckModalProps> = ({
  students,
  statuses,
  lessonDateKey,
  getRank,
  onSetStatus,
  onConfirm,
  onClose
}) => {
  const lessonKeyFor = (student: Student) => `${student.className}:${lessonDateKey}`;
  const checkedCount = students.filter(student => student.pokemonProgress?.lastAttendanceLessonKey === lessonKeyFor(student)).length;
  const actionableCount = students.length - checkedCount;
  const presentCount = students.filter(student => student.pokemonProgress?.lastAttendanceLessonKey !== lessonKeyFor(student) && (statuses[student.id] || 'present') === 'present').length;
  const lateCount = students.filter(student => student.pokemonProgress?.lastAttendanceLessonKey !== lessonKeyFor(student) && statuses[student.id] === 'late').length;
  const absentCount = students.filter(student => student.pokemonProgress?.lastAttendanceLessonKey !== lessonKeyFor(student) && statuses[student.id] === 'absent').length;

  return (
    <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl overflow-hidden rounded-[32px] border-4 border-sky-700 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-sky-100 bg-sky-700 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-100">Attendance Check</p>
            <h2 className="text-2xl font-black uppercase tracking-wide">Check đi học</h2>
            <p className="text-xs font-bold text-sky-100">Ngày {lessonDateKey} · {students.length} trainer trong lớp</p>
          </div>
          <button
            onClick={onClose}
            className="self-end rounded-2xl bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-white/25 sm:self-auto"
          >
            Đóng
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-4 custom-scrollbar">
          {students.length === 0 ? (
            <p className="py-16 text-center text-sm font-bold text-gray-400">Không có trainer trong lớp hiện tại.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {students.map(student => {
                const lessonKey = lessonKeyFor(student);
                const alreadyChecked = student.pokemonProgress?.lastAttendanceLessonKey === lessonKey;
                const status = statuses[student.id] || student.attendanceStatus || (student.isAbsent ? 'absent' : 'present');
                getRank(student.points, student.gender);

                return (
                  <div
                    key={student.id}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                      alreadyChecked ? 'border-gray-200 bg-gray-50 opacity-70' : statusStyles[status]
                    }`}
                  >
                    <StudentAvatar student={student} className="h-12 w-12 shrink-0 rounded-2xl border border-white shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-900">{student.name}</p>
                      <p className="truncate text-[10px] font-bold text-gray-500">{student.className}</p>
                    </div>
                    {alreadyChecked ? (
                      <span className="shrink-0 rounded-full bg-gray-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-600">Đã chốt</span>
                    ) : (
                      <div className="grid shrink-0 grid-cols-1 gap-1">
                        {(['present', 'late', 'absent'] as AttendanceStatus[]).map(value => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => onSetStatus(student.id, value)}
                            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider transition-all ${
                              status === value ? statusStyles[value] : 'border-gray-200 bg-white text-gray-400 hover:text-gray-700'
                            }`}
                          >
                            {statusLabels[value]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-gray-600">
            <span className="font-black text-emerald-700">{presentCount}</span> Có mặt · <span className="font-black text-amber-600">{lateCount}</span> Muộn · <span className="font-black text-rose-600">{absentCount}</span> Vắng · <span className="font-black text-gray-700">{checkedCount}</span> đã chốt
          </div>
          <button
            disabled={actionableCount <= 0}
            onClick={onConfirm}
            className="rounded-2xl bg-sky-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-sky-800 disabled:bg-gray-300 disabled:text-gray-500"
          >
            Confirm Attendance
          </button>
        </div>
      </div>
    </div>
  );
};
