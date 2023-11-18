import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const { whatsapp } = await UpdateWhatsAppService({
    whatsappId,
    whatsappData: { session: "" }
  });

  StartWhatsAppSession(whatsapp);

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const whatsapp = await ShowWhatsAppService(whatsappId);

    try {
      const wbot = getWbot(whatsapp.id);
      wbot.logout();
    } catch (error) {
      console.log(error);
    }

    const result = await UpdateWhatsAppService({
      whatsappId,
      whatsappData: { session: "" }
    });

  StartWhatsAppSession(result.whatsapp);

    return res.status(200).json({ message: "Session disconnected." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error on disconnect session." });
  }
};

export default { store, remove, update };
