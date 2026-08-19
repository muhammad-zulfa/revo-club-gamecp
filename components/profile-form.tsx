"use client";

import { useMemo, useState } from "react";
import { Race } from "@prisma/client";
import { getClassOptionsForRace, MEMBER_RACE_OPTIONS } from "@/lib/member-profile-options";

type ProfileFormProps = {
  nickname: string;
  level: number;
  className: string;
  race: Race;
};

export function ProfileForm({
  nickname,
  level,
  className,
  race,
}: ProfileFormProps) {
  const [selectedRace, setSelectedRace] = useState<Race>(race);
  const classOptions = useMemo(() => getClassOptionsForRace(selectedRace), [selectedRace]);
  const normalizedClassName = classOptions.includes(className as never)
    ? className
    : classOptions[0];

  return (
    <form action="/api/profile" method="post" className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-600">In-game nickname</span>
        <input
          name="nickname"
          defaultValue={nickname}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-600">Level</span>
        <input
          type="number"
          min="1"
          name="level"
          defaultValue={level}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-600">Race</span>
        <select
          name="race"
          value={selectedRace}
          onChange={(event) => setSelectedRace(event.target.value as Race)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        >
          {MEMBER_RACE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-600">Class</span>
        <select
          key={selectedRace}
          name="className"
          defaultValue={normalizedClassName}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        >
          {classOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
          Save profile
        </button>
      </div>
    </form>
  );
}
