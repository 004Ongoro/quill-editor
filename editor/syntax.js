// Syntax highlighting engine
class SyntaxHighlighter {
    constructor() {
        this.languages = {
            javascript: this.highlightJavaScript.bind(this),
            html: this.highlightHTML.bind(this),
            css: this.highlightCSS.bind(this),
            python: this.highlightPython.bind(this),
            plaintext: this.highlightPlainText.bind(this)
        };
        
        this.theme = {
            keyword: '#569CD6',
            string: '#CE9178',
            comment: '#6A9955',
            number: '#B5CEA8',
            function: '#DCDCAA',
            operator: '#D4D4D4',
            punctuation: '#D4D4D4',
            tag: '#569CD6',
            attribute: '#9CDCFE',
            value: '#CE9178',
            selector: '#D7BA7D',
            property: '#9CDCFE'
        };
    }
    
    highlight(code, language = 'javascript') {
        if (this.languages[language]) {
            return this.languages[language](code);
        }
        return this.escapeHtml(code);
    }
    
    highlightJavaScript(code) {
        const keywords = [
            'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
            'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
            'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
            'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
            'var', 'void', 'while', 'with', 'yield', 'let', 'await', 'async',
            'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'
        ];
        
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        const stringRegex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
        const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/mg;
        const numberRegex = /\b\d+(\.\d+)?\b/g;
        const functionRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        
        let highlighted = this.escapeHtml(code);
        
        // Apply highlighting in specific order
        highlighted = highlighted.replace(commentRegex, 
            `<span style="color: ${this.theme.comment}">$1</span>`);
        
        highlighted = highlighted.replace(stringRegex,
            `<span style="color: ${this.theme.string}">$&</span>`);
        
        highlighted = highlighted.replace(keywordRegex,
            `<span style="color: ${this.theme.keyword}">$&</span>`);
        
        highlighted = highlighted.replace(numberRegex,
            `<span style="color: ${this.theme.number}">$&</span>`);
        
        highlighted = highlighted.replace(functionRegex,
            `<span style="color: ${this.theme.function}">$1</span>(`);
        
        return highlighted;
    }
    
    highlightHTML(code) {
        const tagRegex = /&lt;\/?([a-zA-Z][a-zA-Z0-9]*)\b/g;
        const attrRegex = /\s([a-zA-Z-]+)=/g;
        const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
        const commentRegex = /(&lt;!--[\s\S]*?--&gt;)/g;
        
        let highlighted = this.escapeHtml(code);
        
        highlighted = highlighted.replace(commentRegex,
            `<span style="color: ${this.theme.comment}">$1</span>`);
        
        highlighted = highlighted.replace(tagRegex,
            (match, tagName) => match.replace(tagName, 
                `<span style="color: ${this.theme.tag}">${tagName}</span>`));
        
        highlighted = highlighted.replace(attrRegex,
            (match, attrName) => match.replace(attrName,
                `<span style="color: ${this.theme.attribute}">${attrName}</span>`));
        
        highlighted = highlighted.replace(stringRegex,
            `<span style="color: ${this.theme.value}">$&</span>`);
        
        return highlighted;
    }
    
    highlightCSS(code) {
        const selectorRegex = /([^{}]+)(?={)/g;
        const propertyRegex = /\s*([a-zA-Z-]+)\s*:/g;
        const valueRegex = /:\s*([^;}]+)/g;
        const commentRegex = /(\/\/.*$|\/\*[\s\S]*?\*\/)/mg;
        const stringRegex = /(["'])(?:(?=(\\?))\2.)*?\1/g;
        
        let highlighted = this.escapeHtml(code);
        
        highlighted = highlighted.replace(commentRegex,
            `<span style="color: ${this.theme.comment}">$1</span>`);
        
        highlighted = highlighted.replace(stringRegex,
            `<span style="color: ${this.theme.string}">$&</span>`);
        
        highlighted = highlighted.replace(selectorRegex,
            (match) => match.replace(/([^{]+)/, 
                `<span style="color: ${this.theme.selector}">$1</span>`));
        
        highlighted = highlighted.replace(propertyRegex,
            (match, property) => match.replace(property,
                `<span style="color: ${this.theme.property}">${property}</span>`));
        
        highlighted = highlighted.replace(valueRegex,
            (match, value) => match.replace(value,
                `<span style="color: ${this.theme.value}">${value}</span>`));
        
        return highlighted;
    }
    
    highlightPython(code) {
        const keywords = [
            'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
            'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
            'except', 'finally', 'for', 'from', 'global', 'if', 'import',
            'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
            'return', 'try', 'while', 'with', 'yield'
        ];
        
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        const stringRegex = /(["'`])(?:(?=(\\?))\2.)*?\1/g;
        const commentRegex = /(#.*$)/mg;
        const numberRegex = /\b\d+(\.\d+)?\b/g;
        const functionRegex = /\b(def)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        
        let highlighted = this.escapeHtml(code);
        
        highlighted = highlighted.replace(commentRegex,
            `<span style="color: ${this.theme.comment}">$1</span>`);
        
        highlighted = highlighted.replace(stringRegex,
            `<span style="color: ${this.theme.string}">$&</span>`);
        
        highlighted = highlighted.replace(keywordRegex,
            `<span style="color: ${this.theme.keyword}">$&</span>`);
        
        highlighted = highlighted.replace(numberRegex,
            `<span style="color: ${this.theme.number}">$&</span>`);
        
        highlighted = highlighted.replace(functionRegex,
            `<span style="color: ${this.theme.keyword}">$1</span> <span style="color: ${this.theme.function}">$2</span>`);
        
        return highlighted;
    }
    
    highlightPlainText(code) {
        return this.escapeHtml(code);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/ /g, '&nbsp;');
    }
    
    applyHighlighting(element, language) {
        if (!element || !element.textContent) return;
        
        const code = element.textContent.replace(/<br>/g, '\n').replace(/&nbsp;/g, ' ');
        const highlighted = this.highlight(code, language);
        element.innerHTML = highlighted;
    }
}

// Initialize syntax highlighter and connect with editor
document.addEventListener('DOMContentLoaded', () => {
    window.syntaxHighlighter = new SyntaxHighlighter();
    
    // Override the applySyntaxHighlighting method in the UI
    if (window.editorUI) {
        const originalMethod = window.editorUI.applySyntaxHighlighting;
        
        window.editorUI.applySyntaxHighlighting = function() {
            const code = this.codeEditor.value;
            const language = this.currentLanguage;
            const highlighted = window.syntaxHighlighter.highlight(code, language);
            this.syntaxHighlight.innerHTML = highlighted;
            this.syncScroll();
        };
    }
});