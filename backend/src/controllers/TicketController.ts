import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import ShowUserService from "../services/UserServices/ShowUserService";
import formatBody from "../helpers/Mustache";
import DownloadTicketService from "../services/TicketServices/DownloadTicketService";
import ExcelJS from 'exceljs';
import Message from "../models/Message";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const user = await ShowUserService(userId);
  const whatsappId = user.whatsappId;
  const profile = user.profile;

  let queueIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    pageNumber,
    status,
    date,
    showAll,
    userId,
    whatsappId,
    queueIds,
    withUnreadMessages,
    profile
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId }: TicketData = req.body;

  const ticket = await CreateTicketService({ contactId, status, userId });

  const io = getIO();
  io.to(ticket.status).emit("ticket", {
    action: "update",
    ticket
  });

  return res.status(200).json(ticket);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const contact = await ShowTicketService(ticketId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;

  const { ticket } = await UpdateTicketService({
    ticketData,
    ticketId
  });

  if (ticket.status === "closed") {
    const whatsapp = await ShowWhatsAppService(ticket.whatsappId);

    const { farewellMessage } = whatsapp;

    if (farewellMessage) {
      await SendWhatsAppMessage({
        body: formatBody(farewellMessage, ticket.contact),
        ticket
      });
    }
  }

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticket.status)
    .to(ticketId)
    .to("notification")
    .emit("ticket", {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};


export const download = async (req: Request, res: Response) => {

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="data.xlsx"');
  res.setHeader('Transfer-Encoding', 'chunked'); // Menggunakan HTTP chunked encoding


  const { tickets } = await DownloadTicketService();

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const worksheet = workbook.addWorksheet('Tickets');

  worksheet.addRow(["id", "customer_name", "cs_name", "customer_number", "address", "subdistrict", "city", "province", "chat_text", "content_length", "chat_customer", "chat_cs", "timestamp", "customer_response_time", "cs_response_time", "label"]);
  let row = 2;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const ticketId = ticket.id;
    const messages = await Message.findAll({
      where: { ticketId },
      order: [["createdAt", "ASC"]]
    });
    let rowStart = row;
    for (let j = 0; j < messages.length; j++) {
      let secondsDiffCustomer = 0;
      let secondsDiffCS = 0;
      const message = messages[j];
      if (j > 0) {
        if (message.fromMe) {
          secondsDiffCS = Math.floor((message.createdAt.getTime() - messages[j - 1].createdAt.getTime()) / 1000);
        } else {
          secondsDiffCustomer = Math.floor((message.createdAt.getTime() - messages[j - 1].createdAt.getTime()) / 1000);
        }
      }
      let alamat = '';
      let nama = '';
      let kecamatan = '';
      let kota = '';
      let provinsi = '';

      if (message.body.includes('Alamat') && message.body.includes('Nama') && message.body.includes('Kecamatan') && message.body.includes('Kota Kab') && message.body.includes('Provinsi')) {
        const messageExplode = message.body.split('*');
        for (let index = 0; index < messageExplode.length; index++) {
          if (index == 0) {
            continue;
          }


          const label = messageExplode[index - 1];

          switch (label) {
            case "Alamat":
              alamat = messageExplode[index];
              break;
            case "Nama":
              nama = messageExplode[index];
              break;
            case "Kecamatan":
              kecamatan = messageExplode[index];
              break;
            case "Kota Kab":
              kota = messageExplode[index];
              break;
            case "Provinsi":
              provinsi = messageExplode[index];
              break;
          }


        }
      }

      worksheet.addRow([ticket.id, nama, ticket.user.name, ticket.contact.number, alamat, kecamatan, kota, provinsi,(message.fromMe? 'CS:' : 'CT:')+ message.body, message.body.length, message.fromMe ? "" : message.body, message.fromMe ? message.body : "", message.createdAt, secondsDiffCustomer, secondsDiffCS, ticket.status]);
      row++;
    }
    if ((row - 1) > rowStart) {
      worksheet.mergeCells('A' + rowStart + ':A' + (row - 1));
      worksheet.mergeCells('B' + rowStart + ':B' + (row - 1));
      worksheet.mergeCells('C' + rowStart + ':C' + (row - 1));
      worksheet.mergeCells('D' + rowStart + ':D' + (row - 1));
      worksheet.mergeCells('E' + rowStart + ':E' + (row - 1));
      worksheet.mergeCells('F' + rowStart + ':F' + (row - 1));
      worksheet.mergeCells('G' + rowStart + ':G' + (row - 1));
      worksheet.mergeCells('H' + rowStart + ':H' + (row - 1));
      worksheet.mergeCells('O' + rowStart + ':O' + (row - 1));
      worksheet.getRow(row - 1).commit();
    }

  }

  await workbook.commit();
  res.end();
};

