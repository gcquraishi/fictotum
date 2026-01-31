import { HistoricalFigure } from "@/lib/types";

interface Props {
  status?: 'Historical' | 'Fictional' | 'Disputed';
  isFictional?: boolean; // Fallback
}

export default function HistoricityBadge({ status, isFictional }: Props) {
  // Normalize status
  const finalStatus = status || (isFictional ? 'Fictional' : 'Historical');

  const styles = {
    Historical: "bg-green-50 text-green-800 border-green-600",
    Fictional: "bg-purple-50 text-purple-800 border-purple-600",
    Disputed: "bg-yellow-50 text-yellow-800 border-yellow-600",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 ${styles[finalStatus]}`}>
      {finalStatus}
    </span>
  );
}
