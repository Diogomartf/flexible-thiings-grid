import { componentNames, sourceCodes } from "./Playground";
import { toast } from "sonner";

import flexibleThiingsGridSource from "../lib/FlexibleThiingsGrid.tsx?raw";

type SourceCodeProps = {
  currentExample: number;
};

const SourceCode = ({ currentExample }: SourceCodeProps) => {
  const currentComponentName = componentNames[currentExample];
  const currentSourceCode = sourceCodes[currentExample];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSourceCode).then(() => {
      toast.success("Example code copied to clipboard!");
    });
  };

  const handleCopyFlexibleThiingsGrid = async () => {
    await navigator.clipboard.writeText(flexibleThiingsGridSource);
    toast.success("FlexibleThiingsGrid component copied to clipboard!");
  };

  return (
    <section className="flex-[2] p-4 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="mb-4">
        <h3 className="m-0 text-lg font-semibold">{currentComponentName}</h3>
      </div>

      <pre className="bg-gray-100 p-4 rounded-lg text-xs leading-relaxed overflow-auto flex-1 border border-gray-200 font-mono mb-4">
        <code>{currentSourceCode}</code>
      </pre>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium hover:bg-blue-700 transition-colors duration-200"
        >
          Copy Example
        </button>

        <button
          onClick={handleCopyFlexibleThiingsGrid}
          className="flex-1 px-4 py-2.5 bg-gray-600 text-white border-none rounded-lg cursor-pointer text-sm font-medium hover:bg-gray-700 transition-colors duration-200"
        >
          Copy FlexibleThiingsGrid.tsx
        </button>
      </div>
    </section>
  );
};

export default SourceCode;
