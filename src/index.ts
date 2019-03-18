import https from 'https'
import cheerio from 'cheerio'

interface Website {
  image: string
  title: string
  url: string
}

const getPage = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    https
      .get(url, res => {
        let data = ''
        res.on('data', d => (data += d))
        res.on('end', () => resolve(data))
      })
      .on('error', err => reject(err.message))
  })

const parseHtml = (html: string) => {
  const result: Website[] = []
  const $ = cheerio.load(html)

  $('.box').each((i, elem) => {
    const url = $(elem)
      .find('.screenshot > a')
      .attr('href')
    const title = $(elem)
      .find('.screenshot + p')
      .contents()
      .first()
      .text()
    const image = $(elem)
      .find('.screenshot > a > img')
      .attr('src')
    if (image && title && url) {
      result.push({ image, title, url })
    }
  })
  return result
}

const main = async () => {
  const html = await getPage('https://brutalistwebsites.com')
  const websites = parseHtml(html)
  console.log(websites.length)
}

main()
