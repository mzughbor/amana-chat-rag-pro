import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { clsx } from "clsx";

interface ChatBubbleIconProps {
  className?: string;
}

export function ChatBubbleIcon({ className }: ChatBubbleIconProps) {
  return (
    <ChatBubbleLeftRightIcon
      className={clsx("w-6 h-6 text-current", className)}
      aria-hidden="true"
    />
  );
}

