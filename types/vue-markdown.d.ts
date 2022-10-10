declare module '@adapttive/vue-markdown' {
    export interface VueMarkdown extends Vue {
        watches: Array<string>
        plugins: Array<any>
        source: string
        show: boolean
        highlight: boolean
        html: boolean
        xhtmlOut: boolean
        breaks: boolean
        linkify: boolean
        emoji: boolean
        typographer: boolean
        langPrefix: string
        quotes: string
        tableClass: string
        taskLists: boolean
        toc: boolean
        tocId: string
        tocClass: string
        tocFirstLevel: number
        tocLastLevel: number
        tocAnchorLink: boolean
        tocAnchorClass: string
        tocAnchorLinkSymbol: string
        tocAnchorLinkSpace: boolean
        externalPreview: boolean
        updatePrism: boolean
        tocAnchorLinkClass: string
        anchorAttributes: object
        prerender: Function
        postrender: Function
    }
}
