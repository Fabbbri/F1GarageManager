export class SponsorController {
  constructor(sponsorService) {
    this.sponsorService = sponsorService;
  }

  async list(req, res, next) {
    try {
      const sponsors = await this.sponsorService.listSponsors();
      res.json(sponsors);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const sponsor = await this.sponsorService.getSponsor(req.params.id);
      if (!sponsor) {
        return res.status(404).json({ error: 'Sponsor not found' });
      }
      res.json(sponsor);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const sponsor = await this.sponsorService.addSponsor(req.body);
      res.status(201).json(sponsor);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const sponsor = await this.sponsorService.editSponsor(req.params.id, req.body);
      if (!sponsor) {
        return res.status(404).json({ error: 'Sponsor not found' });
      }
      res.json(sponsor);
    } catch (err) {
      next(err);
    }
  }

  async remove(req, res, next) {
    try {
      await this.sponsorService.removeSponsor(req.params.id);
      res.json({ message: 'Sponsor deleted' });
    } catch (err) {
      next(err);
    }
  }
}