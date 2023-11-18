import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import ShowUserService from "../UserServices/ShowUserService";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";

interface Request {
  perpage?: string;
  page?: string;
  start?: string;
  end?: string;
  whatsappId?: string;
}

interface Response {
  tickets: Ticket[];
}

const DownloadTicketService = async (
  { perpage,
    page,
    start,
    end,
    whatsappId
  }: Request
): Promise<Response> => {

  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "profilePicUrl"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    }
  ];


  let whereCondition: Filterable["where"] = {};

  if (whatsappId) {
    whereCondition = {
      whatsappId: whatsappId
    };
  }



  if (start && end) {
    const startDate = +startOfDay(parseISO(start));
    const endDate = +endOfDay(parseISO(end));

    whereCondition = {
      updatedAt: { [Op.between]: [startDate, endDate] }
    };
  }

  const limit = perpage? parseInt(perpage) : undefined;
  const offset = page && limit? ((parseInt(page) - 1) * limit) : undefined;


  const tickets = await Ticket.findAll({
    include: includeCondition,
    order: [["updatedAt", "DESC"]],
    where: { [Op.or]: [{ status: "closed" }, { status: "unclosed" }], ...whereCondition },
    limit,
    offset
  });

  return { tickets };
};

export default DownloadTicketService;
