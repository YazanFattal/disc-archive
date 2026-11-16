(() => {
  const catalog = window.discArchiveGames
  const consoles = {
    ps1: { title: 'PlayStation', volume: '01' },
    ps2: { title: 'PlayStation 2', volume: '02' },
    xbox360: { title: 'Xbox 360', volume: '03' }
  }
  const find = selector => document.querySelector(selector)
  const collection = find('#catalog')
  const grid = find('#covers')
  const template = find('#cover-template')
  const search = find('#search')
  const genre = find('#genre')
  const sort = find('#sort')
  const dialog = find('#game-dialog')
  const modalImage = find('#game-image')
  const modalSource = find('#game-source')
  const gameplay = find('#gameplay')
  const gameplayImage = find('#gameplay-image')
  const gameplaySource = find('#gameplay-source')
  const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
  const controls = document.querySelectorAll('[data-console]')
  const searchKey = value => value.normalize('NFKD').toLowerCase().replace(/\p{Mark}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
  let consoleId = 'ps1'
  let renderedConsole

  for (const game of catalog) game.searchKey = searchKey([game.title, game.alias].filter(Boolean).join(' '))

  function render() {
    const games = catalog.filter(game => game.console === consoleId)
    if (renderedConsole !== consoleId) {
      const volume = consoles[consoleId]
      find('#volume-title').textContent = volume.title
      find('#volume-label').textContent = 'VOLUME ' + volume.volume
      const genres = [...new Set(games.map(game => game.genre))].sort(collator.compare)
      genre.replaceChildren(new Option('All genres', ''), ...genres.map(name => new Option(name, name)))
      for (const control of controls) {
        const current = control.dataset.console === consoleId
        if (control.matches('a')) control.setAttribute('aria-current', current ? 'true' : 'false')
        else control.setAttribute('aria-pressed', String(current))
      }
      collection.dataset.console = consoleId
      renderedConsole = consoleId
    }

    const words = searchKey(search.value).split(' ').filter(Boolean)
    const visible = games.filter(game =>
      (!genre.value || game.genre === genre.value) && words.every(word => game.searchKey.includes(word))
    )
    if (sort.value === 'alphabetical') visible.sort((first, second) => collator.compare(first.title, second.title))
    if (sort.value === 'oldest') visible.sort((first, second) => first.year - second.year)
    if (sort.value === 'newest') visible.sort((first, second) => second.year - first.year)

    const cards = visible.map((game, index) => {
      const card = template.content.firstElementChild.cloneNode(true)
      const button = card.querySelector('button')
      const image = card.querySelector('img')
      button.dataset.game = game.id
      button.setAttribute('aria-label', 'View ' + game.title)
      card.querySelector('.game-card-title').textContent = game.title
      card.querySelector('.game-card-meta').textContent = game.year + '  ·  ' + game.genre
      card.querySelector('.cover-placeholder').textContent = game.title
      image.addEventListener('error', () => { image.hidden = true }, { once: true })
      if (index < 8) image.loading = 'eager'
      image.src = game.cover
      return card
    })

    grid.replaceChildren(...cards)
    find('#empty').hidden = visible.length > 0
    find('#count').textContent = visible.length === games.length
      ? games.length + ' games'
      : visible.length + ' of ' + games.length + ' games'
  }

  function openDetails(game) {
    find('#game-title').textContent = game.title
    find('#game-volume').textContent = consoles[game.console].title
    find('#game-year').textContent = game.year
    find('#game-genre').textContent = game.genre
    find('#game-region').textContent = game.region
    find('#game-description').textContent = game.description
    modalImage.hidden = false
    modalImage.alt = game.title + ' cover'
    modalImage.src = game.cover
    modalSource.href = game.source

    const screenshot = window.discArchiveGameplay?.[game.console + '/' + game.id]
    gameplay.hidden = !screenshot
    if (screenshot) {
      gameplayImage.alt = screenshot.alt
      gameplayImage.width = screenshot.width
      gameplayImage.height = screenshot.height
      gameplayImage.src = screenshot.image
      gameplaySource.href = screenshot.source
    } else {
      gameplayImage.removeAttribute('src')
    }

    if (!dialog.open) dialog.showModal()
    dialog.scrollTop = 0
  }

  function readLocation() {
    const [section, id] = window.location.hash.slice(1).split('/')
    if (Object.hasOwn(consoles, section) && section !== consoleId) {
      consoleId = section
      search.value = ''
    }
    if (renderedConsole !== consoleId) render()
    const game = catalog.find(entry => entry.console === section && entry.id === id)
    if (game) openDetails(game)
    else if (dialog.open) dialog.close()
  }

  for (const control of controls) {
    control.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      const next = control.dataset.console
      if (window.location.hash !== '#' + next) history.pushState(null, '', '#' + next)
      readLocation()
      if (control.matches('a')) collection.scrollIntoView({ block: 'start' })
    })
  }
  find('.nav-search').addEventListener('click', event => {
    event.preventDefault()
    collection.scrollIntoView({ block: 'start' })
    search.focus({ preventScroll: true })
  })
  grid.addEventListener('click', event => {
    const card = event.target.closest('[data-game]')
    if (!card) return
    const game = catalog.find(entry => entry.console === consoleId && entry.id === card.dataset.game)
    history.pushState({ gameOpenedFromCatalog: true }, '', '#' + consoleId + '/' + game.id)
    openDetails(game)
  })
  modalImage.addEventListener('error', () => { modalImage.hidden = true })
  gameplayImage.addEventListener('error', () => { gameplay.hidden = true })
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    if (!window.location.hash.includes('/')) return
    if (history.state?.gameOpenedFromCatalog) history.back()
    else history.replaceState(null, '', '#' + consoleId)
  })
  search.addEventListener('input', render)
  genre.addEventListener('change', render)
  sort.addEventListener('change', render)
  find('#reset').addEventListener('click', () => {
    search.value = ''
    genre.value = ''
    render()
    search.focus()
  })
  window.addEventListener('hashchange', readLocation)
  window.addEventListener('popstate', readLocation)
  readLocation()
})()
