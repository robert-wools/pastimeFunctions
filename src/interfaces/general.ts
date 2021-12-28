
interface userDoc {
  details: {
    id: string,
    title: string,
    subtitle: string,
    img: string,
    dark: boolean,
    email: string,
    lang: string,
    token: string,
    customer: string,
  },
  balance: number, points: number,
  locations: Array<string>, perks: Array<string>, milestones: Array<string>, connected: Array<string>,
}

