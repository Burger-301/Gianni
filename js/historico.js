import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyListDiv = document.getElementById('history-list');
const btnFilter = document.getElementById('btn-filter');

// Guardar os dados localmente para facilitar a partilha e geração do PDF
let allOrders = [];

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

            html += `
                <div style="background: #fff; margin-bottom: 15px; padding: 15px; border-radius: 6px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <h3 style="margin: 0 0 10px 0; color: #007BFF;">Cliente: ${os.clientName || 'N/A'}</h3>
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
                            📄 Gerar Relatório e Encaminhar
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

// Função global para gerar o PDF e abrir as opções de partilha nativa com o ficheiro anexo
window.gerarEPartilharPDF = async function(osId) {
    try {
        const os = allOrders.find(item => item.id === osId);
        if (!os) {
            alert("Ordem de Serviço não encontrada!");
            return;
        }

        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        // Construção do documento PDF
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(16);
        docPDF.text("Relatório de Assistência Técnica", 20, 20);

        docPDF.setFontSize(11);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Cliente: ${os.clientName || 'N/A'}`, 20, 32);
        docPDF.text(`Equipamento: ${os.equipment || 'N/A'} (Marca: ${os.brand || '-'} / Mod: ${os.model || '-'})`, 20, 40);
        docPDF.text(`Tipo de Serviço: ${os.serviceNature || ''} - ${os.serviceArea || ''}`, 20, 48);
        docPDF.text(`Manutentor: ${os.technicianName || 'N/A'}`, 20, 56);
        docPDF.text(`Início: ${os.timeStart || '-'} | Fim: ${os.timeEnd || '-'}`, 20, 64);
        
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Descrição do Serviço:", 20, 76);
        docPDF.setFont("helvetica", "normal");
        
        const splitDescription = docPDF.splitTextToSize(os.description || 'Sem descrição', 170);
        docPDF.text(splitDescription, 20, 84);

        let posY = 95 + (splitDescription.length * 5);

        // Resumo Financeiro no PDF
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Resumo Financeiro:", 20, posY);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`- Horas Trabalhadas: ${os.totalHours || '0'}h (Valor Horas: ${os.valorDasHoras || '0.00'}€)`, 20, posY + 8);
        docPDF.text(`- Mão de Obra Manual: ${os.laborValueManual || '0.00'}€`, 20, posY + 16);
        docPDF.setFont("helvetica", "bold");
        docPDF.text(`- Valor Total: ${os.totalValue || '0.00'}€`, 20, posY + 24);

        posY += 38;

        // Inserir assinaturas se existirem
        if (os.technicianSignature) {
            docPDF.addImage(os.technicianSignature, 'PNG', 20, posY, 60, 25);
            docPDF.text("Assinatura Manutentor", 20, posY + 30);
        }

        if (os.customerSignature) {
            docPDF.addImage(os.customerSignature, 'PNG', 120, posY, 60, 25);
            docPDF.text("Assinatura Cliente", 120, posY + 30);
        }

        // Criar o ficheiro PDF em formato Blob e objeto File
        const pdfBlob = docPDF.output('blob');
        const fileName = `Relatorio_OS_${osId.substring(0, 6)}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Tentar partilha nativa do dispositivo (WhatsApp, E-mail, etc.)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    title: 'Relatório de Assistência Técnica',
                    text: `Segue o relatório técnico referente ao equipamento ${os.equipment}.`,
                    files: [pdfFile],
                });
                return;
            } catch (error) {
                if (error.name === 'AbortError') return; // Cancelado pelo utilizador
            }
        }

        // Fallback caso o navegador do PC não suporte partilha direta de ficheiros
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        alert("Relatório PDF gerado e descarregado com sucesso!");

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

// Carregar todo o histórico inicialmente
loadHistory();
