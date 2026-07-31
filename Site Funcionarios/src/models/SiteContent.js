// Modelo do conteudo editavel do site.
// A administracao salva aqui evento, areas, palestrantes, galeria e cronograma.
import mongoose from "mongoose";

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
      index: true
    },
    event: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    areas: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    schedule: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    faq: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    people: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    gallery: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    ticket: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true,
    minimize: false
  }
);

siteContentSchema.index({ updatedAt: -1 });

siteContentSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  }
});

export const SiteContent = mongoose.model("SiteContent", siteContentSchema);
