import React from 'react';
import { Gender, RankInfo, Student } from '../types';

interface AttendanceCheckModalProps {
  students: Student[];
  getRank: (pts: number, gender: Gender) => RankInfo;
  onToggle: (studentId: string) => void;
  onClose: () => void;
}

export const AttendanceCheckModal: React.FC<AttendanceCheckModalProps> = ({
  students,
  getRank,
  onToggle,
  onClose
}) => {
  const presentCount = students.filter(student => !student.isAbsent).length;
  const absentCount = students.length - presentCount;

  return (
    <div className="fixed inset-0 z-[175] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border-4 border-sky-700 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-sky-100 bg-sky-700 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-100">Attendance Check</p>
            <h2 className="text-2xl font-black uppercase tracking-wide">Check đi học</h2>
            <p className="text-xs font-bold text-sky-100">{presentCount} có mặt · {absentCount} vắng</p>
          </div>
          <button
            onClick={onClose}
            className="self-end rounded-2xl bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-white/25 sm:self-auto"
          >
            Hoàn tất
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-4 custom-scrollbar">
          {students.length === 0 ? (
            <p className="py-16 text-center text-sm font-bold text-gray-400">Không có học sinh trong lớp hiện tại.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {students.map(student => {
                const rank = getRank(student.points, student.gender);
                const isAbsent = !!student.isAbsent;
                return (
                  <button
                    key={student.id}
                    onClick={() => onToggle(student.id)}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                      isAbsent
                        ? 'border-rose-300 bg-rose-50 opacity-80 hover:border-rose-500'
                        : 'border-sky-200 bg-sky-50 hover:border-sky-500'
                    }`}
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={student.customAvatar || rank.avatar || 'https://api.dicebear.com/7.x/bottts/svg'}
                      className="h-12 w-12 shrink-0 rounded-2xl border border-white object-cover shadow-sm"
                      alt={student.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-900">{student.name}</p>
                      <p className="truncate text-[10px] font-bold text-gray-500">{student.className}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                      isAbsent ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                    }`}>
                      {isAbsent ? 'Vắng' : 'Có mặt'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
