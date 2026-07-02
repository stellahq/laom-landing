// Diagnostics du quiz "Qu'est-ce qui te freine vraiment ?" — source unique,
// utilisée par la page /quiz (affichage) ET /api/form/quiz (email de résultat).

export const piliers = ['Cadre de vie', 'Rythme', 'Communauté', 'Connexion à soi', 'Alignement vie / activité']

// Un diagnostic par pilier (index aligné sur `piliers`).
// gap = formulation du décalage · why = cause -> effet · bascule = première direction + LAOM
export const diagnostics = [
  { gap: 'ton cadre de vie',
    why: 'On finit par ressembler au cadre dans lequel on vit. Un environnement fermé, gris, sans nature ni vraie lumière, ton corps le sait avant ta tête : l’énergie baisse, l’attention s’effrite, la motivation s’érode sans raison apparente. Ce n’est pas toi qui flanches. C’est ton décor qui ne te porte plus.',
    bascule: 'Tu n’as pas besoin de tout plaquer. Te poser quelques jours dans un cadre vivant, de la nature, de l’espace, de la lumière, suffit souvent à sentir la différence dans ton corps, et à voir clair sur ce que tu veux vraiment changer. C’est exactement ce qu’on a construit à LAOM.' },
  { gap: 'ton rythme',
    why: 'Quand ton système nerveux ne redescend jamais, ton corps reste en alerte et ton cortisol tourne en continu. Tu fonctionnes en mode survie : tu décides moins bien, tu récupères mal, et même au repos ta tête ne s’arrête pas. Ce n’est pas un manque de volonté. C’est physiologique.',
    bascule: 'La bascule, ce n’est pas de travailler moins. C’est de redonner à ton système nerveux un endroit où redescendre pour de vrai, quelques jours, dans un autre cadre. C’est souvent là que tout se recalibre. Et c’est exactement ce qu’on a construit à LAOM.' },
  { gap: 'ta solitude de dirigeant',
    why: 'Porter seul les décisions, les doutes et la pression, ça a un coût réel. Le lien humain régule ton système nerveux : au contact de gens qui te comprennent, ton niveau de stress baisse, c’est ce qu’on appelle la co-régulation. Sans pairs qui vivent ta réalité, ta charge mentale tourne en boucle, sans soupape.',
    bascule: 'Ce qu’il te manque, ce n’est pas un coach ni une méthode de plus. C’est une table avec des gens qui traversent la même chose, le temps de souffler et de remettre les choses à leur place. C’est exactement ce qu’on a construit à LAOM.' },
  { gap: 'la connexion à toi-même',
    why: 'À force de courir, tu n’entends plus tes signaux faibles : la fatigue, l’intuition, ce qui te nourrit ou ce qui te pèse vraiment. Ton corps continue d’envoyer l’information, mais le bruit couvre tout. À la longue, tu avances par inertie, un peu coupé de ce qui t’anime.',
    bascule: 'Pour te réentendre, il faut baisser le volume : du silence, de l’espace, un rythme qui laisse remonter ce qui compte. Pas besoin de te couper du monde, juste un cadre où tu peux enfin t’écouter. C’est exactement ce qu’on a construit à LAOM.' },
  { gap: 'l’alignement entre ta vie et ton activité',
    why: 'Quand ton activité dicte ta vie au lieu de la servir, une dissonance de fond s’installe. Ça ne se voit pas tout de suite, mais ça use : une fatigue qui ne part pas avec le repos, du sens qui s’érode, le sentiment de subir ce que tu as pourtant construit.',
    bascule: 'La question n’est pas de tout casser, mais de reprendre la main : quelle vie tu veux, et comment ton activité peut s’y plier plutôt que l’inverse. Ça commence par prendre du recul, dans un cadre qui le permet. C’est exactement ce qu’on a construit à LAOM.' },
]
