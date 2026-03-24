import { FileX } from 'lucide-react';

const EmptyState = ({ text, icon: Icon = FileX }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-12 h-12 text-slate-400 mb-4" />
      <p className="text-slate-500">{text}</p>
    </div>
  );
};

export { EmptyState };