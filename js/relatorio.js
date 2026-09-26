import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Função para gerar o PDF e enviar/partilhar
async function gerarEEnviarRelatorio(osId) {
    try {
        // 1. Buscar os dados da O.S. no Firebase
        const docRef = doc(db, "service_orders", osId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Ordem de Serviço não encontrada!");
            return;
        }

        const data = docSnap.data();

        // 2. Inicializar o jsPDF
        const { jsPDF } = window.jspdf;
        const docPDF = new jsPDF();

        // 3. Desenhar o conteúdo do Relatório no PDF
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
        
        // Quebrar texto longo da descrição automaticamente
        const splitDescription = docPDF.splitTextToSize(data.description || 'Sem descrição', 170);
        docPDF.text(splitDescription, 20, 90);

        let posY = 120 + (splitDescription.length * 5);

        docPDF.text(`Início: ${data.startTime || '-'} | Fim: ${data.endTime || '-'}`, 20, posY);
        posY += 10;
        docPDF.text(`Regresso à Base: ${data.returnBase || '-'}`, 20, posY);

        // 4. Inserir as Assinaturas (se existirem em Base64)
        posY += 20;
        if (data.technicianSignature) {
            docPDF.addImage(data.technicianSignature, 'PNG', 20, posY, 60, 25);
            docPDF.text("Assinatura Manutentor", 20, posY + 30);
        }

        if (data.customerSignature) {
            docPDF.addImage(data.customerSignature, 'PNG', 120, posY, 60, 25);
            docPDF.text("Assinatura Cliente", 120, posY + 30);
        }

        // 5. Gerar o Ficheiro PDF
        const pdfBlob = docPDF.output('blob');
        const pdfFile = new File([pdfBlob], `Relatorio_OS_${osId}.pdf`, { type: 'application/pdf' });

        // 6. Enviar por Partilha Nativa (E-mail, WhatsApp, etc.)
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                title: 'Relatório de Assistência Técnica',
                text: `Segue em anexo o relatório da O.S. referente ao equipamento ${data.equipment}.`,
                files: [pdfFile],
            });
        } else {
            // Fallback: Se o navegador não suportar partilha de ficheiros, descarrega o PDF automaticamente
            docPDF.save(`Relatorio_OS_${osId}.pdf`);
            alert("O PDF foi descarregado para o dispositivo. Podes anexá-lo manualmente ao e-mail.");
        }

    } catch (error) {
        console.error("Erro ao gerar o relatório:", error);
        alert("Erro ao gerar ou enviar o relatório.");
    }
}

// Associar a função ao botão de partilha no histórico/ecrã final
window.gerarEEnviarRelatorio = gerarEEnviarRelatorio;
