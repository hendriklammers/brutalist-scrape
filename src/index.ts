import https from 'https'
import fs from 'fs'
import path from 'path'
import util from 'util'
import cheerio from 'cheerio'
import ora, { Ora } from 'ora'

interface Website {
  image: string
  title: string
  url: string
}

const getPage = (pageUrl: string): Promise<string> =>
  new Promise((resolve, reject) => {
    https
      .get(pageUrl, res => {
        let data = ''
        res.on('data', d => (data += d))
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })

const parseHtml = (html: string): Promise<Website[]> =>
  new Promise((resolve, reject) => {
    try {
      const result: Website[] = []
      const $ = cheerio.load(html)

      $('.box')
        .slice(0, 10)
        .each((i, elem) => {
          const urlString = $(elem)
            .find('.screenshot > a')
            .attr('href')
          const titleString = $(elem)
            .find('.screenshot + p')
            .contents()
            .first()
            .text()
          const imageString = $(elem)
            .find('.screenshot > a > img')
            .attr('src')

          if (imageString && titleString && urlString) {
            result.push({
              image: path.basename(imageString),
              title: titleString.trim(),
              url: urlString.trim(),
            })
          }
        })
      resolve(result)
    } catch (err) {
      reject(err)
    }
  })

const downloadImage = (url: string, dir: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const filename = path.basename(url)
    const file = fs.createWriteStream(path.join(__dirname, dir, filename))
    https
      .get(url, res => {
        res.pipe(file)
        file.on('finish', () => resolve(filename))
        file.on('error', reject)
      })
      .on('error', reject)
  })

const getScreenshots = (
  websites: Website[],
  dir: string,
  spinner: Ora
): Promise<string[]> =>
  new Promise(async (resolve, reject) => {
    spinner.text = `Downloading screenshots 0/${websites.length}`
    spinner.start()
    const result: string[] = []
    for (const [index, website] of websites.entries()) {
      const url = path.join(
        'https://brutalistwebsites.com/_img/',
        website.image
      )
      try {
        const image = await downloadImage(url, dir)
        spinner.text = `Downloading screenshots ${index + 1}/${websites.length}`
        result.push(image)
      } catch (err) {
        console.error(err)
      }
    }
    resolve(result)
  })

const writeJSON = (data: Website[], file: string) =>
  util.promisify(fs.writeFile)(
    path.join(__dirname, file),
    JSON.stringify(data, null, 2)
  )

const main = async () => {
  const spinner = ora({
    color: 'white',
    text: 'Scraping titles and urls',
  }).start()

  try {
    const html = await getPage('https://brutalistwebsites.com')
    const websites = await parseHtml(html)
    await writeJSON(websites, '../data/websites.json')
    spinner.succeed()
    await getScreenshots(websites, '../data/img', spinner)
    spinner.succeed()
  } catch (err) {
    console.error(err)
    spinner.stop()
  }
}

main()
