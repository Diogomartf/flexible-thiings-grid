import ThiingsIconsExample from "./examples/ThiingsIcons";
import SimpleNumbersExample from "./examples/SimpleNumbers";
import ColorfulGridExample from "./examples/ColorfulGrid";
import EmojiFunExample from "./examples/EmojiFun";
import CardLayoutExample from "./examples/CardLayout";
import VariableSpansExample from "./examples/VariableSpans";

import thiingsIconsSource from "./examples/ThiingsIcons.tsx?raw";
import simpleNumbersSource from "./examples/SimpleNumbers.tsx?raw";
import colorfulGridSource from "./examples/ColorfulGrid.tsx?raw";
import emojiFunSource from "./examples/EmojiFun.tsx?raw";
import cardLayoutSource from "./examples/CardLayout.tsx?raw";
import variableSpansSource from "./examples/VariableSpans.tsx?raw";

export const exampleComponents = [
  ThiingsIconsExample,
  SimpleNumbersExample,
  EmojiFunExample,
  ColorfulGridExample,
  CardLayoutExample,
  VariableSpansExample,
];

export const sourceCodes = [
  thiingsIconsSource,
  simpleNumbersSource,
  emojiFunSource,
  colorfulGridSource,
  cardLayoutSource,
  variableSpansSource,
];

export const componentNames = sourceCodes.map((code) => {
  const match = code.match(/export\s+default\s+(\w+)/);
  return match?.[1] || "Unknown";
});
type PlaygroundProps = {
  currentExample: number;
};

const Playground = ({ currentExample }: PlaygroundProps) => {
  const ExampleComponent = exampleComponents[currentExample];

  return (
    <div className="flex-1 relative w-full h-full overscroll-none">
      <ExampleComponent />
    </div>
  );
};

export default Playground;
