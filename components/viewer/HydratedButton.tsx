"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RenderButton } from "./RenderButton";

interface HydratedButtonProps {
  placeholderId: string;
  attrs: any;
}

export function HydratedButton({ placeholderId, attrs }: HydratedButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findPlaceholder = () => {
      const el = document.getElementById(placeholderId);
      if (el) {
        setContainer(el);
        setMounted(true);
      } else {
        // Retry shortly in case of race condition with dangerouslySetInnerHTML
        setTimeout(findPlaceholder, 50);
      }
    };

    findPlaceholder();
  }, [placeholderId]);

  if (!mounted || !container) return null;

  return createPortal(<RenderButton attrs={attrs} />, container);
}
