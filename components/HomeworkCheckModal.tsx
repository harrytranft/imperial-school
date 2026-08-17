import React from 'react';
import { Gender, RankInfo, Student } from '../types';

interface HomeworkCheckModalProps {
  students: Student[];
  statuses: Record<string, 'done' | 'missing'>;
  lessonDateKey: string;
  getRank: (pts: number, gender: Gender) => RankInfo;
  onToggle: (studentId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const HomeworkCheckModal: React.FC<HomeworkCheckModalProps> = ({
  students,
  statuses,
  lessonDateKey,
  getRank,
  onToggle,
  onConfirm,
  onClose
}) => {
  const checkedCount = students.filter(student => student.pokemonProgress?.lastHomeworkLessonKey === `${student.className}:${lessonDateKey}`).length;
  const actionableCount = students.length - checkedCount;
  const missingCount = students.filter(student => {
    const lessonKey = `${student.className}:${lessonDateKey}`;
    return student.pokemonProgress?.lastHomeworkLessonKey !== lessonKey && statuses[student.id] === 'missing';
  }).length;

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border-4 border-emerald-700 bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-emerald-100 bg-emerald-700 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100">Homework Check</p>
            <h2 className="text-2xl font-black uppercase tracking-wide">Check BTVN</h2>
            <p className="text-xs font-bold text-emerald-100">Ngày {lessonDateKey} · {students.length} học sinh đang có mặt</p>
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
            <p className="py-16 text-center text-sm font-bold text-gray-400">Không có học sinh đang hiện diện để check BTVN.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {students.map(student => {
                const lessonKey = `${student.className}:${lessonDateKey}`;
                const alreadyChecked = student.pokemonProgress?.lastHomeworkLessonKey === lessonKey;
                const status = alreadyChecked ? 'locked' : (statuses[student.id] || 'done');
                const rank = getRank(student.points, student.gender);

                return (
                  <button
                    key={student.id}
                    disabled={alreadyChecked}
                    onClick={() => onToggle(student.id)}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                      status === 'locked'
                        ? 'border-gray-200 bg-gray-50 opacity-70'
                        : status === 'missing'
                          ? 'border-rose-300 bg-rose-50 hover:border-rose-500'
                          : 'border-emerald-200 bg-emerald-50 hover:border-emerald-500'
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
                      status === 'locked'
                        ? 'bg-gray-200 text-gray-600'
                        : status === 'missing'
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}>
                      {status === 'locked' ? 'Đã chốt' : status === 'missing' ? 'Missing' : 'Done'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-bold text-gray-600">
            <span className="font-black text-emerald-700">{actionableCount}</span> chưa chốt · <span className="font-black text-rose-600">{missingCount}</span> Missing
          </div>
          <button
            disabled={actionableCount <= 0}
            onClick={onConfirm}
            className="rounded-2xl bg-emerald-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg hover:bg-emerald-800 disabled:bg-gray-300 disabled:text-gray-500"
          >
            Confirm Homework
          </button>
        </div>
      </div>
    </div>
  );
};
