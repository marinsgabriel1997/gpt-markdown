console.log("ChatGPT Markdown Converter: content.js injetado");
// Função para converter HTML para Markdown
function htmlToMarkdown(element) {
    console.log("Convertendo HTML para Markdown...");
    let markdown = "";

    element.querySelectorAll('*').forEach(node => {
        if (node.tagName === 'P') {
            markdown += node.textContent + "\n\n";
        } else if (node.tagName === 'STRONG' || node.tagName === 'B') {
            markdown += `**${node.textContent}**`;
        } else if (node.tagName === 'EM' || node.tagName === 'I') {
            markdown += `*${node.textContent}*`;
        } else if (node.tagName === 'OL') {
            let index = 1;
            node.querySelectorAll('li').forEach(li => {
                markdown += `${index}. ${li.textContent}\n`;
                index++;
            });
            markdown += "\n";
        } else if (node.tagName === 'UL') {
            node.querySelectorAll('li').forEach(li => {
                markdown += `- ${li.textContent}\n`;
            });
            markdown += "\n";
        } else if (node.tagName === 'A') {
            markdown += `[${node.textContent}](${node.getAttribute('href')})`;
        } else if (node.tagName === 'CODE') {
            markdown += `\`${node.textContent}\``;
        } else if (node.tagName === 'PRE') {
            markdown += `\n\`\`\`\n${node.textContent}\n\`\`\`\n`;
        }
    });

    console.log(`Markdown convertido: \n${markdown}`);
    return markdown.trim();
}


// Função para criar o botão "Copiar"
function createCopyButton(markdown) {
    const button = document.createElement('button');
    button.innerText = 'Copiar';
    button.style.marginTop = '10px';
    button.style.padding = '5px 10px';
    button.style.cursor = 'pointer';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.fontSize = '14px';

    button.addEventListener('click', () => {
        navigator.clipboard.writeText(markdown).then(() => {
            button.innerText = 'Copiado!';
            setTimeout(() => {
                button.innerText = 'Copiar';
            }, 2000);
        }).catch(err => {
            console.error('Erro ao copiar: ', err);
        });
    });

    return button;
}

// Função para processar as respostas
function processResponses() {
    console.log("Processando respostas...");
    // Selecione os elementos que contêm as respostas do ChatGPT
    const responses = document.querySelectorAll('div.markdown.prose'); // Ajuste o seletor conforme necessário
    console.log(`Encontradas ${responses.length} respostas`);

    responses.forEach((response, index) => {
        // Verifique se já adicionou o botão
        if (!response.querySelector('.copy-button')) {
            console.log(`Adicionando botão "Copiar" à resposta ${index + 1}`);
            const markdown = htmlToMarkdown(response);
            console.log(`Markdown gerado para resposta ${index + 1}: \n${markdown}`);
            const button = createCopyButton(markdown);
            button.classList.add('copy-button');
            response.appendChild(button);
            console.log(`Botão "Copiar" adicionado à resposta ${index + 1}`);
        } else {
            console.log(`Botão "Copiar" já existe na resposta ${index + 1}`);
        }
    });
}


// Observador para detectar mudanças no DOM
const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
        processResponses();
    });
});

// Iniciar a observação
observer.observe(document.body, { childList: true, subtree: true });

// Processar respostas já existentes ao carregar
document.addEventListener('DOMContentLoaded', processResponses);
