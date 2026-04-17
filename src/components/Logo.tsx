import { Link } from "react-router-dom";

export const Logo = ({ collapsed = false }: { collapsed?: boolean }) => {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
        <div className="h-3 w-3 rounded-[3px] bg-background" />
        <div className="absolute inset-0 rounded-lg ring-1 ring-foreground/20" />
      </div>
      {!collapsed && (
        <span className="font-display font-bold text-lg tracking-tight">
          Me<span className="text-muted-foreground">Tube</span>
        </span>
      )}
    </Link>
  );
};
