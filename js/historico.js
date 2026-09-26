import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyListDiv = document.getElementById('history-list');
const btnFilter = document.getElementById('btn-filter');

// Guardar os dados localmente para facilitar a partilha e geração do PDF
let allOrders = [];
let clientsMap = {};

// Função auxiliar para converter a imagem local em Base64 para o jsPDF
async function getBase64ImageFromUrl(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Não foi possível carregar o logótipo:", e);
        return null;
    }
}

// Carregar mapa de clientes para obter dados completos (razao social, cnpj, endereco)
async function carregarClientesMapa() {
    try {
        const querySnapshot = await getDocs(collection(db, "clients"));
        querySnapshot.forEach((docSnap) => {
            clientsMap[docSnap.id] = docSnap.data();
        });
    } catch (error) {
        console.error("Erro ao carregar mapa de clientes:", error);
    }
}

async function loadHistory(startDate = null, endDate = null) {
    try {
        const q = query(collection(db, "service_orders"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        historyListDiv.innerHTML = "";
        allOrders = [];

        if (querySnapshot.empty) {
            historyListDiv.innerHTML = "<p>Nenhuma Ordem de Serviço registada.</p>";
            return;
        }

        let html = "";
        querySnapshot.forEach((doc) => {
            const os = doc.data();
            os.id = doc.id;
            allOrders.push(os);
            
            // Filtragem por data (se preenchida)
            if (startDate || endDate) {
                const osDate = os.timeStart ? os.timeStart.split('T')[0] : '';
                if (startDate && osDate < startDate) return;
                if (endDate && osDate > endDate) return;
            }

            const clientInfo = clientsMap[os.clientId] || {};
            const clientName = clientInfo.name || os.clientName || 'N/A';

            html += `
                <div style="background: #fff; margin-bottom: 15px; padding: 15px; border-radius: 6px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0; color: #007BFF;">Cliente: ${clientName}</h3>
                    <p style="margin: 4px 0;"><strong>Equipamento:</strong> ${os.equipment || 'N/A'} (Marca: ${os.brand || '-'} / Mod: ${os.model || '-'})</p>
                    <p style="margin: 4px 0;"><strong>Tipo:</strong> ${os.serviceNature || ''} / ${os.serviceArea || ''}</p>
                    <p style="margin: 4px 0;"><strong>Manutentor:</strong> ${os.technicianName || 'N/A'}</p>
                    <p style="margin: 4px 0; font-size: 13px; color: #666;">
                        <strong>Início:</strong> ${os.timeStart || 'N/A'} | <strong>Fim:</strong> ${os.timeEnd || 'N/A'}
                    </p>
                    <p style="margin: 4px 0; font-size: 13px; color: #444;">
                        <strong>Horas:</strong> ${os.totalHours || '0'}h (${os.valorDasHoras || '0.00'}€) | <strong>Mão de Obra:</strong> ${os.laborValueManual || '0.00'}€
                    </p>
                    <p style="margin: 4px 0; font-size: 14px;">
                        <strong>Valor Total:</strong> <span style="color: #28a745; font-weight: bold;">${os.totalValue || '0.00'}€</span>
                    </p>
                    <div style="margin-top: 12px; display: flex; gap: 10px; align-items: center;">
                        <span style="font-size: 12px; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">Assinaturas OK</span>
                        <button onclick="gerarEPartilharPDF('${os.id}')" style="background: #28a745; color: white; border: none; padding: 8px 14px; cursor: pointer; border-radius: 4px; font-size: 13px; font-weight: bold;">
                            📄 Gerar Relatório Modelo RG
                        </button>
                    </div>
                </div>
            `;
        });

        if (html === "") {
            historyListDiv.innerHTML = "<p>Nenhuma O.S. encontrada para o intervalo de datas selecionado.</p>";
        } else {
            historyListDiv.innerHTML = html;
        }

    } catch (error) {
        console.error("Erro ao carregar histórico: ", error);
        historyListDiv.innerHTML = "<p>Erro ao carregar os dados do histórico.</p>";
    }
}

// Função global para gerar o PDF com o Logótipo e formato padrão RG Soluções Técnicas
window.gerarEPartilharPDF = async function(osId) {
    try {
        const os = allOrders.find(item => item.id === osId);
        if (!os) {
            alert("Ordem de Serviço não encontrada!");
            return;
        }

        const clientInfo = clientsMap[os.clientId] || {};
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        // Dados Oficiais da Empresa
        const empresa = {
            nome: "RG Soluções Técnicas",
            razaoSocial: "RG Soluções Técnicas Ltda",
            email: "contato@rgsolucoes.com",
            cnpj: "00.000.000/0001-00"
        };

        const dataEmissao = new Date().toLocaleDateString('pt-BR');

        // Tentar carregar e inserir o logótipo no canto superior esquerdo
        const logoBase64 = await getBase64ImageFromUrl('img/logo.png');
        if (logoBase64) {
            // X: 20, Y: 10, Largura: 32, Altura: 14 (ajusta conforme proporção do teu logo)
            docPDF.addImage(logoBase64, 'PNG', 20, 10, 32, 14);
        }

        // CABEÇALHO DO RELATÓRIO (Ao lado do logo)
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(13);
        docPDF.text("Orçamento / Manutenção Técnica", 58, 15);
        
        docPDF.setFontSize(9);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Em: ${dataEmissao}`, 155, 15);

        docPDF.setLineWidth(0.4);
        docPDF.line(20, 27, 190, 27);

        let y = 33;

        // SEÇÃO: EMPRESA RESPONSÁVEL
        docPDF.setFillColor(230, 235, 245);
        docPDF.rect(20, y, 170, 7, 'F');
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(10);
        docPDF.text("Empresa responsável", 22, y + 5);

        y += 7;
        docPDF.setFont("helvetica", "normal");
        docPDF.setFontSize(9);
        docPDF.text(`Nome: ${empresa.nome}`, 22, y + 5);
        docPDF.text(`Razão social: ${empresa.razaoSocial}`, 105, y + 5);
        docPDF.text(`E-mail de contato: ${empresa.email}`, 22, y + 11);
        docPDF.text(`CNPJ: ${empresa.cnpj}`, 105, y + 11);

        y += 18;

        // SEÇÃO: CLIENTE
        docPDF.setFillColor(230, 235, 245);
        docPDF.rect(20, y, 170, 7, 'F');
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Cliente", 22, y + 5);

        y += 7;
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Nome: ${clientInfo.name || os.clientName || 'N/A'}`, 22, y + 5);
        docPDF.text(`Razão social: ${clientInfo.razaoSocial || '-'}` , 105, y + 5);
        docPDF.text(`E-mail: ${clientInfo.email || clientInfo.clientEmail || '-'}` , 22, y + 11);
        docPDF.text(`CNPJ/CPF: ${clientInfo.document || clientInfo.cnpj || '-'}` , 105, y + 11);
        docPDF.text(`Endereço: ${clientInfo.address || '-'}` , 22, y + 17);

        y += 24;

        // SEÇÃO: HORÁRIO
        docPDF.setFillColor(230, 235, 245);
        docPDF.rect(20, y, 170, 7, 'F');
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Horário", 22, y + 5);

        y += 7;
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Data e hora de chegada: ${os.timeStart || 'N/A'}`, 22, y + 5);
        docPDF.text(`Data e hora de saída: ${os.timeEnd || 'N/A'}`, 105, y + 5);

        y += 15;

        // SEÇÃO: SERVIÇOS REALIZADOS
        docPDF.setFillColor(230, 235, 245);
        docPDF.rect(20, y, 170, 7, 'F');
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Serviços a realizar / realizados", 22, y + 5);

        y += 10;
        docPDF.setFont("helvetica", "normal");
        const descSplit = docPDF.splitTextToSize(`Equipamento: ${os.equipment || 'N/A'} (Marca: ${os.brand || '-'} / Mod: ${os.model || '-'})\nTipo: ${os.serviceNature || ''} - ${os.serviceArea || ''}\nDescrição: ${os.description || 'N/A'}`, 165);
        docPDF.text(descSplit, 22, y);

        y += (descSplit.length * 5) + 8;

        // SEÇÃO: VALOR TOTAL
        docPDF.setFillColor(230, 235, 245);
        docPDF.rect(20, y, 170, 7, 'F');
        docPDF.setFont("helvetica", "bold");
        docPDF.text("VALOR TOTAL", 22, y + 5);

        y += 8;
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`• Horas Trabalhadas: ${os.totalHours || '0'}h (Valor Horas: ${os.valorDasHoras || '0.00'}€)`, 22, y + 4);
        docPDF.text(`• Mão de Obra: ${os.laborValueManual || '0.00'}€`, 22, y + 10);
        docPDF.setFont("helvetica", "bold");
        docPDF.text(`• TOTAL GERAL: ${os.totalValue || '0.00'}€`, 22, y + 18);

        y += 28;

        // ASSINATURAS
        docPDF.setLineWidth(0.2);
        docPDF.line(20, y + 15, 90, y + 15);
        docPDF.line(120, y + 15, 190, y + 15);

        docPDF.setFontSize(8);
        docPDF.text("NOME CLIENTE / RESPONSÁVEL", 35, y + 20);
        docPDF.text("ASSINATURA TÉCNICO RESPONSÁVEL", 128, y + 20);

        if (os.technicianSignature) {
            docPDF.addImage(os.technicianSignature, 'PNG', 130, y - 5, 50, 18);
        }

        if (os.customerSignature) {
            docPDF.addImage(os.customerSignature, 'PNG', 30, y - 5, 50, 18);
        }

        // Criar o ficheiro PDF em formato Blob e objeto File
        const pdfBlob = docPDF.output('blob');
        const fileName = `Relatorio_RG_${osId.substring(0, 6)}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Tentar partilha nativa do dispositivo (WhatsApp, E-mail, etc.)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    title: 'Relatório Técnico - RG Soluções',
                    text: `Segue o relatório técnico referente ao equipamento ${os.equipment}.`,
                    files: [pdfFile],
                });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return; // Cancelado pelo utilizador
            }
        }

        // Fallback caso o navegador não suporte partilha direta de ficheiros
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        alert("Relatório PDF gerado com o logótipo e padrão RG Soluções com sucesso!");

    } catch (error) {
        console.error("Erro ao gerar o relatório PDF:", error);
        alert("Ocorreu um erro ao processar o relatório.");
    }
};

// Evento do botão de filtrar
btnFilter.addEventListener('click', () => {
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    loadHistory(start, end);
});

// Carregar todo o histórico e mapa de clientes inicialmente
window.addEventListener('DOMContentLoaded', async () => {
    await carregarClientesMapa();
    await loadHistory();
});
