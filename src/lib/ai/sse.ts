interface AnthropicStreamEvent {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
  };
}

export class AnthropicSSEDecoder {
  private buffer = '';

  done = false;

  push(chunk: string): string[] {
    this.buffer += chunk;
    const deltas: string[] = [];

    while (true) {
      const delimiter = this.buffer.match(/\r?\n\r?\n/);
      if (!delimiter || delimiter.index === undefined) break;

      const block = this.buffer.slice(0, delimiter.index);
      this.buffer = this.buffer.slice(delimiter.index + delimiter[0].length);
      const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');

      if (!data) continue;

      let event: AnthropicStreamEvent;
      try {
        event = JSON.parse(data) as AnthropicStreamEvent;
      } catch {
        continue;
      }

      if (event.type === 'message_stop') {
        this.done = true;
        continue;
      }

      if (event.type === 'error') throw new Error('AI_STREAM_ERROR');
      if (event.type !== 'content_block_delta' || event.delta?.type !== 'text_delta') continue;
      if (event.delta.text) deltas.push(event.delta.text);
    }

    return deltas;
  }
}
