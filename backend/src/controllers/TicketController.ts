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

  worksheet.addRow(["id", "customer_name", "cs_name", "customer_number", "address", "subdistrict", "city", "province", "produk", "chat_text", "content_length", "chat_customer", "chat_cs", "timestamp", "customer_response_time", "cs_response_time", "label"]);
  let row = 2;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const ticketId = ticket.id;
    const messages = await Message.findAll({
      where: { ticketId },
      order: [["createdAt", "ASC"]]
    });
    let rowStart = row;

    let id = ticket.id;
    let alamat = '';
    let nama = ticket.contact.name;
    let kecamatan = '';
    let kota = '';
    let provinsi = '';
    let produk = '';

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

      if (message.body.includes('Alamat') && message.body.includes('Nama') && message.body.includes('Kecamatan') && message.body.includes('Kota Kab') && message.body.includes('Provinsi') && message.body.includes('Produk')) {

        const text = message.body;

        text.split('\n').forEach((line) => {
          console.log('line', line);

          if (line.includes('*Alamat*')) {
            alamat = line.split(':')[1].trim();
          } else if (line.includes('*Nama*')) {
            nama = line.split(':')[1].trim();
          } else if (line.includes('*Kecamatan*')) {
            kecamatan = line.split(':')[1].trim();
          } else if (line.includes('*Kota Kab*')) {
            kota = line.split(':')[1].trim();
          } else if (line.includes('*Provinsi*')) {
            provinsi = line.split(':')[1].trim();
          } else if (line.includes('*Produk*')) {
            produk = line.split(':')[1].trim();
          }
        });
      }

      worksheet.addRow([ticket.id, nama, ticket.user.name, ticket.contact.number, alamat, kecamatan, kota, provinsi, produk, (message.fromMe ? 'CS:' : 'CT:') + message.body, message.body.length, message.fromMe ? "" : message.body, message.fromMe ? message.body : "", message.createdAt, secondsDiffCustomer, secondsDiffCS, ticket.status]);
      row++;
    }
    if ((row - 1) > rowStart) {
      worksheet.mergeCells('A' + rowStart + ':A' + (row - 1));
      worksheet.getCell('A' + rowStart).value = id;
      worksheet.mergeCells('B' + rowStart + ':B' + (row - 1));
      worksheet.getCell('B' + rowStart).value = nama;
      worksheet.mergeCells('C' + rowStart + ':C' + (row - 1));
      worksheet.getCell('C' + rowStart).value = ticket.user.name;
      worksheet.mergeCells('D' + rowStart + ':D' + (row - 1));
      worksheet.getCell('D' + rowStart).value = ticket.contact.number;
      worksheet.mergeCells('E' + rowStart + ':E' + (row - 1));
      worksheet.getCell('E' + rowStart).value = alamat;
      worksheet.mergeCells('F' + rowStart + ':F' + (row - 1));
      worksheet.getCell('F' + rowStart).value = kecamatan;
      worksheet.mergeCells('G' + rowStart + ':G' + (row - 1));
      worksheet.getCell('G' + rowStart).value = kota;
      worksheet.mergeCells('H' + rowStart + ':H' + (row - 1));
      worksheet.getCell('H' + rowStart).value = provinsi;
      worksheet.mergeCells('I' + rowStart + ':I' + (row - 1));
      worksheet.getCell('I' + rowStart).value = produk;
      worksheet.mergeCells('Q' + rowStart + ':Q' + (row - 1));
      worksheet.getCell('Q' + rowStart).value = ticket.status;
      worksheet.getRow(row - 1).commit();
    }

  }

  await workbook.commit();
  res.end();
};

