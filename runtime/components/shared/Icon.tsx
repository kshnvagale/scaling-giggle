interface IconProps {
  emoji: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = { sm: "text-base", md: "text-xl", lg: "text-3xl" };

export function Icon({ emoji, size = "md", className }: IconProps) {
  return (
    <span className={`${sizeMap[size]} ${className ?? ""}`} role="img">
      {emoji}
    </span>
  );
}
