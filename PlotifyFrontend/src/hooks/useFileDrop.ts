import { useRef, useState, type DragEvent } from "react";

// drag & drop for one image; spread `dropProps` on the drop target
export const useFileDrop = (onFile: (file: File) => void) => {
  const [dragging, setDragging] = useState(false);
  // dragenter/dragleave also fire for children, so count them instead of trusting a single leave
  const depth = useRef(0);

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  const dropProps = {
    onDragEnter: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    },
    onDragOver: (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    },
    onDragLeave: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    },
    onDrop: (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) onFile(file);
    },
  };

  return { dragging, dropProps };
};
