"use client"

export const Select = ({ options, onSelect }: {
  onSelect: (value: string) => void;
  options: {
    key: string;
    value: string;
  }[];
}) => {
  return (
    <select 
      onChange={(e) => onSelect(e.target.value)}
      className="border rounded px-3 py-2 w-full"
      defaultValue={options[0]?.value} // Add default value
    >
      {options.map((option) => (
        <option key={option.key} value={option.value}>
          {option.value}
        </option>
      ))}
    </select>
  )
}