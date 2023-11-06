import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import ShowUserService from "../UserServices/ShowUserService";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";


interface Response {
  tickets: Ticket[];
}

const DownloadTicketService = async (): Promise<Response> => {

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

  

  

  

  

  const tickets = await Ticket.findAll({
    include: includeCondition,
    order: [["updatedAt", "DESC"]],
    where: {[Op.or]:[{ status: "closed" }, { status: "unclosed" }]}
  });

  return {tickets};
};

export default DownloadTicketService;
