import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const historyListDiv = document.getElementById('history-list');

// 1. Função para carregar o histórico de O.S. do Firebase
async function carregarHistorico() {
    try {
        const querySnapshot = await getDocs(collection(db, "service_orders"));
        
        if (querySnapshot.empty) {
            historyListDiv.innerHTML = "<p>Nenhuma Ordem de Serviço registada.</p>";
            return;
        }

        let html = "<ul style='list-style: none; padding: 0;'>";
        
        querySnapshot.forEach((documento) => {
            const os = documento.data();
            const osId = documento.id; // ID real do Firebase

            html += `
                <li style="background: #fff; margin-bottom: 12px; padding: 15px; border-radius: 6px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <strong>Cliente:</strong> ${os.clientName || 'N/A'}<br>
                    <strong>Equipamento:</strong> ${os.equipment || 'N/A'}<br>
                    <strong>Tipo:</strong> ${os.serviceType || 'N/A'}<br>
                    <strong>Data/Início:</strong> ${os.startTime || 'N/A'}<br><br>
                    
                    <button onclick="gerarEEnviarRelatorio('${osId}')" style="background: #28a745; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;">
                        📄 Gerar Relatório e Enviar
                    </button>
                </li>
            `;
        });
        
        html += "</ul>";
        historyListDiv.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        historyListDiv.innerHTML = "<p>Erro ao carregar o histórico.</p>";
    }
}

// 2. Função para gerar o PDF, fazer download e abrir o e-mail
async function gerarEEnviarRelatorio(osId) {
    try {
        const docRef = doc(db, "service_orders", osId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Ordem de Serviço não encontrada!");
            return;
        }

        const data = docSnap.data();
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        // Desenhar PDF
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(16);
        docPDF.text("Relatório de Assistência Técnica", 20, 20);

        docPDF.setFontSize(11);
        docPDF.setFont("helvetica", "normal");
        docPDF.text(`Cliente: ${data.clientName || 'N/A'}`, 20, 35);
        docPDF.text(`Equipamento: ${data.equipment || 'N/A'}`, 20, 45);
        docPDF.text(`Tipo de Serviço: ${data.serviceType || 'N/A'}`, 20, 55);
        docPDF.text(`Manutentor: ${data.technicianName || 'N/A'}`, 20, 65);
        
        docPDF.setFont("helvetica", "bold");
        docPDF.text("Descrição do Serviço:", 20, 80);
        docPDF.setFont("helvetica", "normal");
        
        const splitDescription = docPDF.splitTextToSize(data.description || 'Sem descrição', 170);
        docPDF.text(splitDescription, 20, 90);

        let posY = 120 + (splitDescription.length * 5);
        docPDF.text(`Início: ${data.startTime || '-'} | Fim: ${data.endTime || '-'}`, 20, posY);
        posY += 10;
        docPDF.text(`Regresso à Base: ${data.returnBase || '-'}`, 20, posY);

        posY += 20;
        if (data.technicianSignature) {
            docPDF.addImage(data.technicianSignature, 'PNG', 20, posY, 60, 25);
            docPDF.text("Assinatura Manutentor", 20, posY + 30);
        }

        if (data.customerSignature) {
            docPDF.addImage(data.customerSignature, 'PNG', 120, posY, 60, 25);
            docPDF.text("Assinatura Cliente", 120, posY + 30);
        }

        // Gerar e descarregar PDF
        const pdfBlob = docPDF.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);

        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = `Relatorio_OS_${osId}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Abrir e-mail
        const emailCliente = data.clientEmail || ""; 
        const assunto = encodeURIComponent(`Relatório de Assistência Técnica - O.S. ${osId}`);
        const corpo = encodeURIComponent(`Olá,\n\nSegue em anexo o relatório técnico referente ao equipamento ${data.equipment}.\n\nCumprimentos,\n${data.technicianName || 'Equipa Técnica'}`);

        window.location.href = `mailto:${emailCliente}?subject=${assunto}&body=${corpo}`;
        alert("Relatório descarregado com sucesso! O seu programa de e-mail foi aberto.");

    } catch (error) {
        console.error("Erro ao gerar o relatório:", error);
        alert("Erro ao gerar o relatório.");
    }
}

// Tornar a função global para o HTML conseguir chamá-la
window.gerarEEnviarRelatorio = gerarEEnviarRelatorio;

// Executar ao abrir a página
carregarHistorico();
