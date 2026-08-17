"use client";

export function TimezoneOffsetInput({
  name = "timezoneOffsetMinutes",
}: {
  name?: string;
}) {
  return (
    <input
      type="hidden"
      name={name}
      value={new Date().getTimezoneOffset()}
      readOnly
    />
  );
}
