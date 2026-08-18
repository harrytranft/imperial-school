import React from 'react';
import { Student } from '../types';

interface StudentAvatarProps {
  student: Student;
  className?: string;
}

export const getStudentInitials = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

export const StudentAvatar: React.FC<StudentAvatarProps> = ({ student, className = 'h-12 w-12 rounded-2xl' }) => {
  if (student.customAvatar) {
    return (
      <img
        src={student.customAvatar}
        className={`${className} object-cover`}
        alt={student.name}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`${className} grid place-items-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 text-sm font-black text-teal-900 ring-2 ring-white shadow-inner`}>
      {getStudentInitials(student.name)}
    </div>
  );
};
