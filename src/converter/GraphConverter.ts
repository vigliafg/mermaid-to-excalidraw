import { ExcalidrawConfig } from "../index.js";
import { DEFAULT_FONT_SIZE } from "../constants.js";
import { MermaidConversionPayload } from "../interfaces.js";
import { Flowchart } from "../parser/flowchart.js";
import { Sequence } from "../parser/sequence.js";

export class GraphConverter<T = Flowchart | Sequence> {
  private converter;
  constructor({
    converter,
  }: {
    converter: (
      graph: T,
      config: Required<ExcalidrawConfig>
    ) => MermaidConversionPayload;
  }) {
    this.converter = converter;
  }
  convert = (graph: T, config: ExcalidrawConfig) => {
    return this.converter(graph, {
      ...config,
      fontSize: config.fontSize || DEFAULT_FONT_SIZE,
    });
  };
}
