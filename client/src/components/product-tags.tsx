import { ProductTag } from "@/types";
import { cn } from "@/lib/utils";

interface ProductTagsProps {
  tags: string[];
  className?: string;
}

const tagClassMap: Record<string, string> = {
  organic: "tag-organic",
  fresh: "tag-fresh",
  new: "tag-new",
  limited: "tag-limited",
  premium: "tag-premium",
  seasonal: "tag-seasonal",
  "farm-to-table": "tag-farm-to-table",
  "just-picked": "tag-just-picked",
  "local-favorite": "tag-local-favorite",
  "artisan-made": "tag-artisan-made",
};

export function ProductTags({ tags, className }: ProductTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag, index) => {
        const tagClass = tagClassMap[tag.toLowerCase()] || "bg-muted";
        
        return (
          <span
            key={index}
            className={cn(
              "text-white text-xs px-2 py-1 rounded-full font-medium",
              tagClass
            )}
            data-testid={`tag-${tag.toLowerCase()}`}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}

export function ProductTagLarge({ tag }: { tag: string }) {
  const tagClass = tagClassMap[tag.toLowerCase()] || "bg-muted";
  
  return (
    <span
      className={cn(
        "text-white text-xs px-1.5 py-0.5 rounded-full font-medium",
        tagClass
      )}
      data-testid={`tag-large-${tag.toLowerCase()}`}
    >
      {tag}
    </span>
  );
}
