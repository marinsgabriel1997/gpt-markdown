// ==UserScript==
// @name         Markdown Clipboard for ChatGPT
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Adiciona um botão "Copiar" a cada resposta do ChatGPT para copiar o conteúdo em Markdown, com suporte a diversos elementos de formatação.
// @author       Gabriel
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Configuração de depuração
    const DEBUG = false;

    // Função para converter HTML para Markdown
    function htmlToMarkdown(element) {
        let markdown = '';

        // Função recursiva para percorrer os nós
        function traverse(node, indentLevel = 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                // Escapa caracteres Markdown especiais
                const text = node.textContent.replace(/([\\`*_\{\}\[\]()#+\-.!])/g, '\\$1');
                markdown += text;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                switch (node.tagName.toLowerCase()) {
                    case 'p':
                        traverseChildren(node);
                        markdown += '\n\n';
                        break;
                    case 'strong':
                    case 'b':
                        markdown += '**';
                        traverseChildren(node);
                        markdown += '**';
                        break;
                    case 'em':
                    case 'i':
                        markdown += '*';
                        traverseChildren(node);
                        markdown += '*';
                        break;
                    case 'u':
                        markdown += '<u>';
                        traverseChildren(node);
                        markdown += '</u>';
                        break;
                    case 'a':
                        const href = node.getAttribute('href') || '';
                        markdown += `[${node.textContent}](${href})`;
                        break;
                    case 'ul':
                        traverseChildren(node, indentLevel);
                        markdown += '\n';
                        break;
                    case 'ol':
                        traverseChildren(node, indentLevel, true);
                        markdown += '\n';
                        break;
                    case 'li':
                        const parent = node.parentNode;
                        if (parent.tagName.toLowerCase() === 'ul') {
                            markdown += `${'  '.repeat(indentLevel)}- `;
                        } else if (parent.tagName.toLowerCase() === 'ol') {
                            const index = Array.from(parent.children).indexOf(node) + 1;
                            markdown += `${'  '.repeat(indentLevel)}${index}. `;
                        }
                        traverseChildren(node, indentLevel + 1);
                        markdown += '\n';
                        break;
                    case 'code':
                        markdown += `\`${node.textContent}\``;
                        break;
                    case 'pre':
                        // Detecta a linguagem de programação se especificada
                        let lang = '';
                        const codeBlock = node.querySelector('code');
                        if (codeBlock && codeBlock.className.includes('language-')) {
                            const classes = codeBlock.className.split(' ');
                            const langClass = classes.find(cls => cls.startsWith('language-'));
                            if (langClass) lang = langClass.replace('language-', '');
                        }
                        let codeText = node.textContent.trim().replace(/^.*Copiar código\s*/m, '');
                        markdown += `\n\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
                        break;
                    case 'blockquote':
                        markdown += '> ';
                        traverseChildren(node, indentLevel);
                        markdown += '\n\n';
                        break;
                    case 'hr':
                        markdown += '\n---\n';
                        break;
                    case 'h1':
                        markdown += `# ${node.textContent}\n\n`;
                        break;
                    case 'h2':
                        markdown += `## ${node.textContent}\n\n`;
                        break;
                    case 'h3':
                        markdown += `### ${node.textContent}\n\n`;
                        break;
                    case 'h4':
                        markdown += `#### ${node.textContent}\n\n`;
                        break;
                    case 'h5':
                        markdown += `##### ${node.textContent}\n\n`;
                        break;
                    case 'h6':
                        markdown += `###### ${node.textContent}\n\n`;
                        break;
                    case 'table':
                        markdown += '\n';
                        traverseTable(node);
                        markdown += '\n';
                        break;
                    case 'thead':
                        traverseTableHead(node);
                        break;
                    case 'tbody':
                        traverseTableBody(node);
                        break;
                    case 'tr':
                        traverseChildren(node);
                        markdown += '\n';
                        break;
                    case 'th':
                        markdown += `| ${node.textContent.trim()} `;
                        break;
                    case 'td':
                        markdown += `| ${node.textContent.trim()} `;
                        break;
                    case 'br':
                        markdown += '  \n';
                        break;
                    case 'del':
                        markdown += '~~';
                        traverseChildren(node);
                        markdown += '~~';
                        break;
                    case 'sup':
                        markdown += `<sup>${node.textContent}</sup>`;
                        break;
                    case 'sub':
                        markdown += `<sub>${node.textContent}</sub>`;
                        break;
                    case 'img':
                        const src = node.getAttribute('src') || '';
                        const alt = node.getAttribute('alt') || '';
                        markdown += `![${alt}](${src})`;
                        break;
                    default:
                        traverseChildren(node, indentLevel);
                        break;
                }
            }
        }

        function traverseChildren(node, indentLevel = 0, isOrdered = false) {
            Array.from(node.childNodes).forEach(child => {
                traverse(child, indentLevel);
            });
        }

        function traverseTable(table) {
            const headers = [];
            const rows = [];
            const alignments = []; // Para armazenar alinhamento de cada coluna

            // Adiciona uma quebra de linha antes da tabela
            markdown += '\n\n';

            const thead = table.querySelector('thead');
            if (thead) {
                thead.querySelectorAll('tr').forEach(tr => {
                    tr.querySelectorAll('th').forEach(th => {
                        headers.push(th.textContent.trim());
                        // Define o alinhamento das colunas (ajuste conforme necessário)
                        alignments.push('left'); // Padrão: alinhamento centralizado
                    });
                });
            }

            const tbody = table.querySelector('tbody') || table;
            tbody.querySelectorAll('tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach(td => {
                    row.push(td.textContent.trim());
                });
                rows.push(row);
            });

            // Cabeçalho
            if (headers.length > 0) {
                markdown += `| ${headers.join(' | ')} |\n`;
                markdown += `| ${alignments.map(align => {
                    // Ajuste o alinhamento de cada coluna aqui
                    switch (align) {
                        case 'left': return ':---';
                        case 'right': return '---:';
                        case 'center': return ':---:';
                        default: return '---'; // Alinhamento padrão, à esquerda
                    }
                }).join(' | ')} |\n`;
            }

            // Linhas
            rows.forEach(row => {
                markdown += `| ${row.join(' | ')} |\n`;
            });

            // Adiciona uma quebra de linha após a tabela para espaçamento
            markdown += '\n';
        }



        function traverseTableHead(thead) {
            // Já tratado em traverseTable
        }

        function traverseTableBody(tbody) {
            // Já tratado em traverseTable
        }

        traverse(element);
        return markdown.trim();
    }

    // Função para adicionar o botão "Copiar"
    function addCopyButton(responseDiv) {
        // Verifica se o botão já foi adicionado
        if (responseDiv.getAttribute('data-copy-button-added') === 'true') {
            if (DEBUG) console.log('Botão já adicionado a este elemento.');
            return;
        }

        // Cria o botão
        const button = document.createElement('button');
        button.textContent = 'Copiar';
        button.style.position = 'absolute';
        button.style.top = '10px';
        button.style.right = '-70px';
        button.style.zIndex = '999999';
        button.style.padding = '5px 10px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '12px';
        button.style.opacity = '0.8';
        button.style.transition = 'opacity 0.3s, background-color 0.3s';
        button.classList.add('copy-markdown-button');

        // Efeito de hover no botão
        button.addEventListener('mouseover', () => {
            button.style.opacity = '1';
            button.style.backgroundColor = '#45a049';
        });
        button.addEventListener('mouseout', () => {
            button.style.opacity = '0.8';
            button.style.backgroundColor = '#4CAF50';
        });

        // Evento de clique para copiar o conteúdo
        button.addEventListener('click', () => {
            const markdown = htmlToMarkdown(responseDiv);
            navigator.clipboard.writeText(markdown).then(() => {
                button.textContent = 'Copiado!';
                button.style.backgroundColor = '#388E3C';
                setTimeout(() => {
                    button.textContent = 'Copiar';
                    button.style.backgroundColor = '#4CAF50';
                }, 2000);
            }).catch(err => {
                console.error('Erro ao copiar para a área de transferência: ', err);
            });
        });

        // Ajusta o position do responseDiv para relative, se necessário
        const computedStyle = window.getComputedStyle(responseDiv);
        if (computedStyle.position === 'static') {
            responseDiv.style.position = 'relative';
        }

        // Adiciona o botão ao responseDiv
        responseDiv.appendChild(button);

        // Marca o responseDiv como já processado
        responseDiv.setAttribute('data-copy-button-added', 'true');

        if (DEBUG) console.log('Botão "Copiar" adicionado a um responseDiv.');
    }

    // Função para processar todas as respostas existentes
    function processExistingResponses() {
        const selector = 'div.markdown.prose.w-full.break-words.dark\\:prose-invert.dark';
        const responseDivs = document.querySelectorAll(selector);
        if (DEBUG) console.log(`Encontrados ${responseDivs.length} elementos para adicionar o botão.`);
        responseDivs.forEach(div => addCopyButton(div));
    }

    // Função para lidar com mutações no DOM
    function handleMutations(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const selector = 'div.markdown.prose.w-full.break-words.dark\\:prose-invert.dark';
                        if (node.matches(selector)) {
                            addCopyButton(node);
                        }

                        // Verifica se há responseDivs dentro do nó adicionado
                        const nestedDivs = node.querySelectorAll(selector);
                        nestedDivs.forEach(div => addCopyButton(div));
                    }
                });
            }
        }
    }

    // Inicialização
    function init() {
        processExistingResponses();

        // Configura o MutationObserver
        const observer = new MutationObserver(handleMutations);
        observer.observe(document.body, { childList: true, subtree: true });

        if (DEBUG) console.log('MutationObserver iniciado.');
    }

    // Aguarda o carregamento completo do DOM antes de iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
