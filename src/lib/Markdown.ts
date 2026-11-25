import MarkdownIt from 'markdown-it';
import abbreviation from 'markdown-it-abbr';
import deflist from 'markdown-it-deflist';
import emoji from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
import insert from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import subscript from 'markdown-it-sub';
import superscript from 'markdown-it-sup';

// Same plugins and options as the former @adapttive/vue-markdown component, with breaks disabled as the release notes
// used it.
const md = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: false,
    linkify: true,
    typographer: true,
    langPrefix: 'language-',
    quotes: '“”‘’',
})
    .use(subscript)
    .use(superscript)
    .use(footnote)
    .use(deflist)
    .use(abbreviation)
    .use(insert)
    .use(mark)
    .use(emoji);
md.renderer.rules.table_open = () => '<table class="table">\n';

export function renderMarkdown(source: string): string {
    return md.render(source);
}
