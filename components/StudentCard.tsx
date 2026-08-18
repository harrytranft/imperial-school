
import React from 'react';
import { Student, RankInfo, Gender } from '../types';
import { PetSkill } from '../pokemonData';
import { getPokemonArtworkUrl, getPokemonDisplayName, handlePokemonArtworkError } from '../pokemonProgression';
import { StudentAvatar } from './StudentAvatar';

interface StudentCardProps {
  student: Student;
  getRank: (pts: number, gender: Gender) => RankInfo;
  onSelect: (student: Student) => void;
  petSkills: PetSkill[];
  isSelected?: boolean;
  isDimmed?: boolean;
  onHoverChange?: (studentId: string | null) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  getRank,
  onSelect,
  petSkills,
  isSelected,
  isDimmed,
  onHoverChange
}) => {
  getRank(student.points, student.gender);
  const isAbsent = student.isAbsent;

  const egg = student.egg;
  const pet = student.pet;
  const progress = student.pokemonProgress;
  const eggRequiredProgress = egg?.requiredProgress || 10;
  const streakBadges = [
    { key: 'attendance', label: 'Đi học', value: progress?.attendanceStreak || 0, tone: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'answer', label: 'Answer', value: progress?.answerStreak || 0, tone: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'battle', label: 'Battle', value: progress?.battleWinStreak || 0, tone: 'bg-violet-50 text-violet-700 border-violet-200' },
    { key: 'homework', label: 'Homework', value: progress?.homeworkStreak || 0, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  ].filter(badge => badge.value > 0);

  // Helper to determine egg appearance based on hatch progress
  const getEggStatusText = (progress: number) => {
    if (progress >= eggRequiredProgress) return { emoji: '🐣', label: 'Sẵn sàng nở!', color: 'text-green-600' };
    if (progress >= Math.ceil(eggRequiredProgress * 0.7)) return { emoji: '🥚💥', label: 'Nứt sâu, rục rịch!', color: 'text-orange-500 animate-pulse' };
    if (progress >= Math.ceil(eggRequiredProgress * 0.4)) return { emoji: '🥚⚡', label: 'Nứt nhẹ rạn vỏ', color: 'text-amber-500' };
    return { emoji: '🥚', label: 'Trứng nguyên vẹn', color: 'text-gray-400' };
  };

  const eggStatus = egg ? getEggStatusText(egg.progress) : { emoji: '🥚', label: 'Đang ấp trứng', color: 'text-gray-400' };

  return (
    <div 
      onClick={() => onSelect(student)}
      onMouseEnter={() => onHoverChange?.(student.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      className={`relative h-[360px] rounded-[32px] p-5 cursor-pointer flex flex-col gap-4 transition-all duration-300 border-2 backdrop-blur-xl group ${
        isSelected 
          ? 'border-red-800 bg-red-100/90 ring-8 ring-red-800/20 shadow-2xl scale-[1.02] -translate-y-2' 
          : isAbsent 
            ? 'bg-stone-100/80 grayscale border-stone-300 opacity-60 shadow-xs' 
            : 'bg-white/85 border-white/90 shadow-[0_10px_30px_rgba(120,20,20,0.07)] hover:border-cyan-300 hover:-translate-y-3 hover:scale-[1.035] hover:bg-white hover:shadow-[0_0_0_3px_rgba(34,211,238,0.35),0_28px_70px_-12px_rgba(14,165,233,0.55),0_0_55px_rgba(250,204,21,0.35)]'
      } ${isDimmed ? 'opacity-35 brightness-75 saturate-50 scale-[0.98]' : ''}`}
    >
      <div className={`absolute top-0 right-0 px-4 py-2 text-[9px] rounded-bl-2xl uppercase font-black tracking-widest ${isSelected ? 'bg-red-800 text-white shadow-md' : 'bg-amber-100/80 text-amber-900 border-b border-l border-amber-200/60'}`}>
        {student.className}
      </div>

      <div className="flex items-center gap-5 mt-4">
        <div className="w-20 h-20 shrink-0 relative">
          <StudentAvatar student={student} className="w-full h-full rounded-[24px] border-4 border-white shadow-lg" />
          {isAbsent && (
            <div className="absolute inset-0 bg-gray-900/60 rounded-[24px] flex items-center justify-center text-[10px] text-white font-black uppercase tracking-widest">VẮNG</div>
          )}
          {isSelected && (
            <div className="absolute -top-3 -right-3 bg-red-800 text-white w-8 h-8 rounded-full border-4 border-white flex items-center justify-center font-bold text-sm shadow-lg">✓</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Pokemon immediately to the left of student's name inside the name tag */}
            {pet && (
              <div className="relative group/poke shrink-0">
                <img 
                  referrerPolicy="no-referrer"
                  src={getPokemonArtworkUrl(pet)}
                  onError={event => handlePokemonArtworkError(event, pet)}
                  alt={getPokemonDisplayName(pet)}
                  className={`w-8 h-8 object-contain cursor-pointer transition-transform group-hover/poke:scale-125 ${pet.isShiny ? 'rounded-full bg-amber-100 ring-2 ring-amber-300' : ''}`}
                />
                {/* Hover preview card showing enlarged Pokemon, name, and skills */}
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/poke:flex flex-col bg-amber-950 text-white p-3 rounded-2xl shadow-2xl z-50 w-52 border border-amber-400/40 pointer-events-none animate-in fade-in zoom-in duration-200">
                  <img 
                    referrerPolicy="no-referrer"
                    src={getPokemonArtworkUrl(pet)}
                    onError={event => handlePokemonArtworkError(event, pet)}
                    alt={getPokemonDisplayName(pet)}
                    className="w-24 h-24 object-contain mx-auto my-1"
                  />
                  <p className="font-extrabold text-amber-300 text-sm text-center">{pet.isShiny ? '✨ ' : ''}{getPokemonDisplayName(pet)}</p>
                  <p className="text-[10px] text-amber-200/80 text-center uppercase font-mono">{pet.types?.join(', ')}</p>
                  <div className="mt-2 border-t border-amber-800/60 pt-1.5">
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1">Kỹ năng sở hữu ({pet.skills?.length || 0}):</p>
                    {pet.skills && pet.skills.length > 0 ? (
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {pet.skills.map(skId => {
                          const sk = petSkills.find(s => s.id === skId);
                          return (
                            <div key={skId} className="bg-amber-900/80 text-amber-100 text-[10px] p-1.5 rounded-lg border border-amber-700/50 flex items-center gap-1.5">
                              <span className="text-sm">{sk?.icon || '✨'}</span>
                              <div className="min-w-0">
                                <p className="font-bold truncate">{sk?.name || skId}</p>
                                <p className="text-[8px] text-amber-300/80 line-clamp-1">{sk?.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[9px] text-amber-200/60 italic text-center">Chưa có kỹ năng</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-800 truncate">{student.name}</h3>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-teal-700">Pokemon Trainer</p>
          {streakBadges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {streakBadges.map(badge => (
                <span key={badge.key} className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-tight ${badge.tone}`}>
                  {badge.label} x{badge.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NEW POKEMON COMPANION STATUS COMPONENT */}
      <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100/50 flex items-center gap-3 mt-1 min-h-[92px]">
        {pet ? (
          <>
            <div className="w-10 h-10 shrink-0 bg-white rounded-xl border border-amber-200 p-0.5 flex items-center justify-center shadow-sm relative group/pet animate-in fade-in zoom-in duration-300">
              <img 
                referrerPolicy="no-referrer"
                src={getPokemonArtworkUrl(pet)}
                onError={event => handlePokemonArtworkError(event, pet)}
                className="w-full h-full object-contain"
                alt={getPokemonDisplayName(pet)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-xs font-black text-amber-700 truncate">{pet.isShiny ? '✨ ' : ''}{getPokemonDisplayName(pet)} · Lv.{pet.level || 1}</p>
                <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  ❤️ HP: {pet.hp ?? 100}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${(pet.hp ?? 100) > 50 ? 'bg-emerald-500' : (pet.hp ?? 100) > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, pet.hp ?? 100))}%` }}
                />
              </div>
              <p className="text-[8px] text-gray-400 truncate mt-0.5">
                {pet.skills.length > 0 ? `${pet.skills.length} tuyệt chiêu` : 'Chưa có kỹ năng bổ trợ'}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={`text-2xl transform transition-transform duration-500 hover:rotate-12 ${egg && egg.progress >= Math.ceil(eggRequiredProgress * 0.7) ? 'animate-bounce' : ''}`}>
              {eggStatus.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-gray-600">Ấp Trứng Pokémon</span>
                <span className={`font-black ${eggStatus.color}`}>{egg ? egg.progress : 0}/{eggRequiredProgress}đ</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1 max-w-full">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, ((egg ? egg.progress : 0) / eggRequiredProgress) * 100))}%` }}
                />
              </div>
              <p className="text-[8px] text-gray-400 mt-0.5 truncate italic">{eggStatus.label}</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-auto flex justify-between items-end pt-4 border-t border-gray-50">
        <div className="flex-1">
           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-red-800 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, Math.max(0, (student.points % 50) / 50 * 100))}%` }}
              />
           </div>
           <p className="text-[8px] uppercase opacity-30 mt-1 font-bold">Level kế tiếp</p>
        </div>
        <div className="ml-6 flex flex-col items-end">
           <p className={`text-3xl font-black leading-none ${student.points >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
             {student.points}
           </p>
           <p className="text-[8px] uppercase font-black opacity-30 mt-1">Hào Quang</p>
        </div>
      </div>
    </div>
  );
};
