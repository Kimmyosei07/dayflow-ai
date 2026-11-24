/**
 * Minimal, safe Markdown renderer for AI replies.
 * Supports headings, bullet/numbered lists, code blocks, **bold**, *italic*
 * and `inline code`. It builds React elements (no innerHTML), so AI output
 * can never inject HTML or scripts into the page.
 */
function renderInline(text, keyPrefix) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Markdown({ text }) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++]);
      i += 1;
      blocks.push(<pre key={`b${blocks.length}`}><code>{code.join('\n')}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const Tag = heading[1].length <= 2 ? 'h3' : 'h4';
      blocks.push(<Tag key={`b${blocks.length}`}>{renderInline(heading[2], `h${i}`)}</Tag>);
      i += 1;
      continue;
    }

    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*•])\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*•])\s+/, ''));
        i += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={`b${blocks.length}`}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item, `l${i}-${n}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|```)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(<p key={`b${blocks.length}`}>{renderInline(para.join(' '), `p${i}`)}</p>);
  }

  return <div className="markdown">{blocks}</div>;
}
