"""
ChronosGraph: Bridge to Empire - Age of Augustus Expansion

Expands the graph to include Early Empire era works:
- I, Claudius (Robert Graves novel, 1934)
- I, Claudius (BBC TV series, 1976)
- Cleopatra (Film, 1963)

Features:
- Cross-era figure identification (Republic → Empire)
- ConflictNode creation for characterization shifts
- INTERACTED_WITH relationships based on historical record
- Anachronism data from scholarly reviews

Sources:
- Harvard Egyptologist Peter Der Manuelian on AC Origins
- Dr. Roel Konijnendijk and Dr. Michael Taylor on HBO Rome
- I, Claudius character analysis from GradeSaver
"""

import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# Add parent directory to path for schema import
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema import (
    HistoricalFigure, MediaWork, Portrayal,
    MediaType, Sentiment, SCHEMA_CONSTRAINTS
)

ERROR_LOG = []

def log_error(context: str, error: Exception):
    ERROR_LOG.append({
        "timestamp": datetime.now().isoformat(),
        "context": context,
        "error": str(error)
    })
    print(f"  [ERROR] {context}: {error}")


# =============================================================================
# NEW HISTORICAL FIGURES: Early Empire / Julio-Claudian Dynasty
# =============================================================================

NEW_HISTORICAL_FIGURES = [
    # === Julio-Claudian Emperors ===
    HistoricalFigure(
        canonical_id="claudius",
        name="Claudius",
        birth_year=-10,
        death_year=54,
        title="Emperor of Rome",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="tiberius",
        name="Tiberius",
        birth_year=-42,
        death_year=37,
        title="Emperor of Rome",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="caligula",
        name="Caligula (Gaius)",
        birth_year=12,
        death_year=41,
        title="Emperor of Rome",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="nero",
        name="Nero",
        birth_year=37,
        death_year=68,
        title="Emperor of Rome",
        era="Roman Empire"
    ),

    # === Imperial Family ===
    HistoricalFigure(
        canonical_id="germanicus",
        name="Germanicus",
        birth_year=-15,
        death_year=19,
        title="Roman General",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="agrippina_elder",
        name="Agrippina the Elder",
        birth_year=-14,
        death_year=33,
        title="Roman Noblewoman",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="agrippina_younger",
        name="Agrippina the Younger",
        birth_year=15,
        death_year=59,
        title="Empress of Rome",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="antonia_minor",
        name="Antonia Minor",
        birth_year=-36,
        death_year=37,
        title="Roman Noblewoman",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="drusus_elder",
        name="Drusus the Elder",
        birth_year=-38,
        death_year=-9,
        title="Roman General",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="drusus_younger",
        name="Drusus the Younger",
        birth_year=-13,
        death_year=23,
        title="Roman General",
        era="Roman Empire"
    ),

    # === Political Figures ===
    HistoricalFigure(
        canonical_id="sejanus",
        name="Lucius Aelius Sejanus",
        birth_year=-20,
        death_year=31,
        title="Praetorian Prefect",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="livilla",
        name="Livilla",
        birth_year=-13,
        death_year=31,
        title="Roman Noblewoman",
        era="Roman Empire"
    ),

    # === Wives and Consorts ===
    HistoricalFigure(
        canonical_id="messalina",
        name="Valeria Messalina",
        birth_year=17,
        death_year=48,
        title="Empress of Rome",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="poppaea",
        name="Poppaea Sabina",
        birth_year=30,
        death_year=65,
        title="Empress of Rome",
        era="Roman Empire"
    ),

    # === Earlier Figures (Cross-era) ===
    HistoricalFigure(
        canonical_id="marcellus",
        name="Marcus Claudius Marcellus (nephew)",
        birth_year=-42,
        death_year=-23,
        title="Heir of Augustus",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="gaius_caesar",
        name="Gaius Caesar",
        birth_year=-20,
        death_year=4,
        title="Heir of Augustus",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="lucius_caesar",
        name="Lucius Caesar",
        birth_year=-17,
        death_year=2,
        title="Heir of Augustus",
        era="Roman Empire"
    ),
    HistoricalFigure(
        canonical_id="agrippa_postumus",
        name="Agrippa Postumus",
        birth_year=-12,
        death_year=14,
        title="Heir of Augustus",
        era="Roman Empire"
    ),

    # === Client Kings ===
    HistoricalFigure(
        canonical_id="herod_agrippa",
        name="Herod Agrippa I",
        birth_year=-11,
        death_year=44,
        title="King of Judea",
        era="Roman Empire"
    ),

    # === Cleopatra 1963 specific ===
    HistoricalFigure(
        canonical_id="sosigenes",
        name="Sosigenes of Alexandria",
        birth_year=-90,
        death_year=-40,
        title="Astronomer",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="rufio",
        name="Rufio",
        birth_year=None,
        death_year=None,
        title="Roman Commander",
        era="Roman Republic"
    ),
]


# =============================================================================
# NEW MEDIA WORKS
# =============================================================================

NEW_MEDIA_WORKS = [
    MediaWork(
        media_id="i_claudius_novel",
        title="I, Claudius",
        media_type=MediaType.BOOK,
        release_year=1934,
        creator="Robert Graves"
    ),
    MediaWork(
        media_id="i_claudius_bbc",
        title="I, Claudius",
        media_type=MediaType.TV_SERIES,
        release_year=1976,
        creator="Jack Pulman (BBC)"
    ),
    MediaWork(
        media_id="cleopatra_1963",
        title="Cleopatra",
        media_type=MediaType.FILM,
        release_year=1963,
        creator="Joseph L. Mankiewicz"
    ),
]


# =============================================================================
# PORTRAYALS: I, Claudius (Novel)
# =============================================================================

I_CLAUDIUS_NOVEL_PORTRAYALS = [
    Portrayal(
        figure_id="claudius",
        media_id="i_claudius_novel",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist/narrator - stammering scholar who survives imperial intrigue",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="livia_drusilla",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Master manipulator who poisons rivals to secure Tiberius's succession",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="I, Claudius: Archetypal poisoner vs HBO Rome: Merely ambitious young woman"
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="i_claudius_novel",
        sentiment=Sentiment.COMPLEX,
        role_description="Benevolent but blind emperor, manipulated by Livia",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="I, Claudius: Kindly old emperor vs HBO Rome: Cold young schemer"
    ),
    Portrayal(
        figure_id="tiberius",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Paranoid tyrant who retreats to Capri for debauchery",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="caligula",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Mad emperor who declares himself a god",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="germanicus",
        media_id="i_claudius_novel",
        sentiment=Sentiment.HEROIC,
        role_description="Noble general beloved by the people, poisoned by rivals",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="agrippina_elder",
        media_id="i_claudius_novel",
        sentiment=Sentiment.HEROIC,
        role_description="Brave widow who challenges Tiberius, ultimately exiled",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sejanus",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Scheming Praetorian Prefect who manipulates Tiberius",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="messalina",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Nymphomaniac empress who betrays Claudius",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="antonia_minor",
        media_id="i_claudius_novel",
        sentiment=Sentiment.COMPLEX,
        role_description="Stern mother ashamed of Claudius but ultimately loyal",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="livilla",
        media_id="i_claudius_novel",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Sejanus's mistress who conspires to murder her husband",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_agrippa",
        media_id="i_claudius_novel",
        sentiment=Sentiment.HEROIC,
        role_description="Loyal general and Augustus's right hand",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="herod_agrippa",
        media_id="i_claudius_novel",
        sentiment=Sentiment.COMPLEX,
        role_description="Claudius's childhood friend who becomes King of Judea",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# PORTRAYALS: I, Claudius (BBC TV)
# =============================================================================

I_CLAUDIUS_BBC_PORTRAYALS = [
    Portrayal(
        figure_id="claudius",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.HEROIC,
        role_description="Derek Jacobi's iconic portrayal - the wise fool who survives",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="livia_drusilla",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Siân Phillips's legendary performance - cold, calculating poisoner",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="I, Claudius BBC: Iconic villain vs HBO Rome: Young ambitious woman"
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.COMPLEX,
        role_description="Brian Blessed's Augustus - genial emperor blind to Livia's schemes",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="I, Claudius BBC: Warm, deceived patriarch vs HBO Rome: Cold young schemer"
    ),
    Portrayal(
        figure_id="tiberius",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.COMPLEX,
        role_description="George Baker's Tiberius - reluctant emperor corrupted by power",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="caligula",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="John Hurt's terrifying performance - insane god-emperor",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sejanus",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Patrick Stewart's Sejanus - ambitious manipulator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="germanicus",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.HEROIC,
        role_description="David Robb's noble hero, too good for the corrupt court",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="agrippina_elder",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.HEROIC,
        role_description="Fiona Walker's fierce widow challenging tyranny",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="nero",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Christopher Biggins as young Nero, showing early cruelty",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="messalina",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Scheming empress whose debauchery leads to her death",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="agrippina_younger",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Barbara Young's ruthless mother who murders Claudius",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="antonia_minor",
        media_id="i_claudius_bbc",
        sentiment=Sentiment.COMPLEX,
        role_description="Margaret Tyzack's dignified matron",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# PORTRAYALS: Cleopatra (1963)
# =============================================================================

CLEOPATRA_1963_PORTRAYALS = [
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Elizabeth Taylor's iconic queen - intelligent, passionate, tragic",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="julius_caesar",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Rex Harrison's charming, witty Caesar - romantic hero",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Cleopatra 1963: Romantic hero vs AC Origins: Villainous antagonist"
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Richard Burton's passionate, tragic Antony - romantic lead",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Cleopatra 1963: Tragic romantic hero vs Cicero Trilogy: Villain who murders Cicero"
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="cleopatra_1963",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Roddy McDowall's cold, calculating Octavian - political schemer",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="Cleopatra 1963: Cold schemer vs I, Claudius: Kindly old Augustus"
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="cleopatra_1963",
        sentiment=Sentiment.COMPLEX,
        role_description="Kenneth Haigh's conflicted assassin",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_cassius",
        media_id="cleopatra_1963",
        sentiment=Sentiment.VILLAINOUS,
        role_description="John Hoyt's scheming conspirator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="cleopatra_1963",
        sentiment=Sentiment.NEUTRAL,
        role_description="Michael Hordern's elder statesman",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_agrippa",
        media_id="cleopatra_1963",
        sentiment=Sentiment.NEUTRAL,
        role_description="Andrew Keir's loyal general",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="calpurnia",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Gwen Watford's devoted, tragic wife",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="ptolemy_xiii",
        media_id="cleopatra_1963",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Richard O'Sullivan's petulant boy-king",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="apollodorus",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Cesare Danova's loyal servant",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="casca",
        media_id="cleopatra_1963",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Carroll O'Connor's conspirator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sosigenes",
        media_id="cleopatra_1963",
        sentiment=Sentiment.HEROIC,
        role_description="Hume Cronyn's wise astronomer who creates the Julian calendar",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# ANACHRONISMS: Scholarly Critiques
# =============================================================================

ANACHRONISMS = {
    "hbo_rome": {
        "source": "Historians Dr. Roel Konijnendijk, Dr. Michael Taylor, Archaeology Magazine",
        "inaccuracies": [
            "Atia portrayed as scheming seductress; historically described as pious, virtuous matron by Tacitus",
            "Battle formations devolve into 'Hollywood brawl' - lose historical cohesion mid-fight",
            "Missing key historical figures: Fulvia (Antony's wife), Porcia (Brutus's wife)",
            "Lack of ethnic diversity - real Roman Empire was far more diverse",
            "Vorenus and Pullo's lives entirely fabricated beyond names from Caesar's writings"
        ]
    },
    "ac_origins": {
        "source": "Harvard Egyptologist Peter Der Manuelian, Dr. Chris Naunton",
        "inaccuracies": [
            "Bayek as 'last Medjay' - Medjay ceased to exist centuries before 49 BCE",
            "Greek-Egyptian ethnic conflict exaggerated; historical record shows integration",
            "Statues shown unpainted; would have been brightly colored with pigments",
            "Cyrene shown near Alexandria; actually 500 miles away in modern Libya",
            "Buildings show no signs of reconstruction despite fragmentary historical evidence"
        ]
    }
}


# =============================================================================
# INTERACTED_WITH: Historical Social Connections
# =============================================================================

INTERACTIONS = [
    # === First Triumvirate ===
    ("julius_caesar", "pompey_magnus", "Political alliance and rivalry; married to Caesar's daughter Julia"),
    ("julius_caesar", "marcus_crassus", "First Triumvirate alliance; political and financial partnership"),
    ("pompey_magnus", "marcus_crassus", "Reluctant alliance in First Triumvirate; longstanding rivalry"),

    # === Caesar's Circle ===
    ("julius_caesar", "cleopatra_vii", "Lovers; Caesar supported her claim to Egyptian throne"),
    ("julius_caesar", "marcus_antonius", "Caesar's loyal general and political heir"),
    ("julius_caesar", "marcus_brutus", "Political protégé; Caesar possibly Brutus's biological father"),
    ("julius_caesar", "cicero", "Political rivalry softened by mutual respect; corresponded frequently"),
    ("julius_caesar", "vercingetorix", "Military enemies; Caesar defeated Vercingetorix at Alesia"),
    ("julius_caesar", "calpurnia", "Third wife; warned him of Ides of March"),
    ("julius_caesar", "servilia", "Long-term lovers; mother of Brutus"),

    # === Conspirators ===
    ("marcus_brutus", "gaius_cassius", "Co-leaders of Caesar's assassination; brothers-in-law"),
    ("marcus_brutus", "decimus_brutus", "Fellow conspirators; both named Brutus but distant relations"),
    ("marcus_brutus", "cicero", "Political allies; Cicero supported the Liberators"),

    # === Second Triumvirate ===
    ("octavian_augustus", "marcus_antonius", "Rivals, then allies (Second Triumvirate), then enemies"),
    ("octavian_augustus", "lepidus", "Third member of Second Triumvirate; later marginalized"),
    ("octavian_augustus", "marcus_agrippa", "Lifelong friend and general; married Octavian's daughter"),
    ("octavian_augustus", "gaius_maecenas", "Trusted advisor and patron of the arts"),
    ("marcus_antonius", "cleopatra_vii", "Lovers; political and military alliance against Octavian"),

    # === Julio-Claudian Dynasty ===
    ("octavian_augustus", "livia_drusilla", "Married for 51 years; Livia promoted Tiberius"),
    ("octavian_augustus", "tiberius", "Adopted son and successor; initially passed over"),
    ("livia_drusilla", "tiberius", "Mother and son; Livia allegedly murdered rivals for him"),
    ("tiberius", "sejanus", "Praetorian Prefect who manipulated Tiberius"),
    ("tiberius", "germanicus", "Adopted son; popular general, possibly poisoned"),
    ("germanicus", "agrippina_elder", "Married; she championed their children after his death"),
    ("caligula", "claudius", "Nephew and uncle; Caligula humiliated Claudius at court"),
    ("claudius", "messalina", "Third wife; her betrayal shocked Rome"),
    ("claudius", "agrippina_younger", "Fourth wife; she allegedly poisoned him"),
    ("agrippina_younger", "nero", "Mother and son; he eventually had her murdered"),

    # === Spartacus War ===
    ("spartacus", "crixus", "Co-leaders of slave rebellion; disagreed on strategy"),
    ("spartacus", "marcus_crassus", "Military enemies; Crassus defeated and crucified rebels"),

    # === Marian-Sullan Era ===
    ("gaius_marius", "sulla", "Allies turned bitter enemies; civil war between factions"),
    ("gaius_marius", "julius_caesar", "Marius was Caesar's uncle by marriage"),
    ("sulla", "pompey_magnus", "Sulla gave Pompey the title 'Magnus' (Great)"),

    # === Egyptian Court ===
    ("cleopatra_vii", "ptolemy_xiii", "Siblings and co-rulers; civil war for throne"),
    ("ptolemy_xiii", "pothinus", "Regent who controlled boy-king"),
    ("cleopatra_vii", "caesarion", "Mother and son; co-ruler of Egypt"),

    # === Cicero's World ===
    ("cicero", "catiline", "Enemies; Cicero exposed Catiline's conspiracy"),
    ("cicero", "clodius", "Bitter enemies; Clodius exiled Cicero"),
    ("cicero", "milo", "Political allies; Cicero defended Milo"),
    ("cicero", "tiro", "Master and freedman secretary; lifelong bond"),
    ("cicero", "terentia", "Married 30 years; she managed his affairs"),
    ("cicero", "hortensius", "Rival orators who developed mutual respect"),
    ("cicero", "gaius_verres", "Cicero prosecuted Verres for corruption"),
]


# =============================================================================
# CONFLICT NODES: Cross-Era Characterization Shifts
# =============================================================================

CONFLICT_NODES = [
    {
        "figure_id": "octavian_augustus",
        "conflict_id": "octavian_young_vs_old",
        "conflict_type": "Cross-Era Characterization",
        "description": "Young schemer vs Wise patriarch",
        "portrayals": [
            {"media_id": "hbo_rome", "sentiment": "Villainous", "era": "Young Octavian",
             "notes": "Cold, calculating, emotionally distant manipulator"},
            {"media_id": "cleopatra_1963", "sentiment": "Villainous", "era": "Young Octavian",
             "notes": "Political schemer, Roddy McDowall's calculating performance"},
            {"media_id": "i_claudius_novel", "sentiment": "Complex", "era": "Old Augustus",
             "notes": "Benevolent but blind emperor, manipulated by Livia"},
            {"media_id": "i_claudius_bbc", "sentiment": "Complex", "era": "Old Augustus",
             "notes": "Brian Blessed's warm, genial patriarch deceived by wife"},
        ],
        "analysis": "Octavian/Augustus shows the most dramatic characterization shift across media. Works set during his rise (Rome, Cleopatra) portray him as coldly ambitious, while works set during his reign (I, Claudius) show a kindly but naive old man. This reflects both his historical transformation and different narrative needs."
    },
    {
        "figure_id": "livia_drusilla",
        "conflict_id": "livia_young_vs_mature",
        "conflict_type": "Cross-Era Characterization",
        "description": "Ambitious young woman vs Master poisoner",
        "portrayals": [
            {"media_id": "hbo_rome", "sentiment": "Complex", "era": "Young Livia",
             "notes": "Intelligent, ambitious but not yet villainous"},
            {"media_id": "i_claudius_novel", "sentiment": "Villainous", "era": "Mature Livia",
             "notes": "Archetypal poisoner, eliminates all rivals systematically"},
            {"media_id": "i_claudius_bbc", "sentiment": "Villainous", "era": "Mature Livia",
             "notes": "Siân Phillips's iconic cold-blooded performance"},
        ],
        "analysis": "Livia's portrayal shifts dramatically between works. HBO Rome shows her as newly married and merely ambitious, while I, Claudius (both versions) portrays her as history's greatest poisoner. Robert Graves's interpretation has become the dominant cultural image."
    },
    {
        "figure_id": "marcus_antonius",
        "conflict_id": "antony_heroic_vs_villainous",
        "conflict_type": "Perspective-Based Conflict",
        "description": "Tragic romantic hero vs Murderous political thug",
        "portrayals": [
            {"media_id": "hbo_rome", "sentiment": "Complex", "era": "Full Career",
             "notes": "Passionate, loyal, impulsive but sympathetic protagonist"},
            {"media_id": "cleopatra_1963", "sentiment": "Heroic", "era": "Egyptian Period",
             "notes": "Richard Burton's tragic romantic hero"},
            {"media_id": "cicero_trilogy", "sentiment": "Villainous", "era": "Civil Wars",
             "notes": "The brutal man who orders Cicero's murder"},
            {"media_id": "plutarch_lives", "sentiment": "Complex", "era": "Full Career",
             "notes": "Great general ruined by passion for Cleopatra"},
        ],
        "analysis": "Mark Antony's portrayal depends entirely on the narrative perspective. From Cleopatra's viewpoint, he's a tragic romantic hero. From Cicero's viewpoint, he's the murderer who ordered his execution. This represents genuine historical ambiguity."
    },
    {
        "figure_id": "julius_caesar",
        "conflict_id": "caesar_hero_vs_villain",
        "conflict_type": "Moral Interpretation",
        "description": "Brilliant hero vs Tyrannical villain",
        "portrayals": [
            {"media_id": "masters_of_rome", "sentiment": "Heroic", "era": "Full Career",
             "notes": "Brilliant, charismatic leader who transforms Rome"},
            {"media_id": "cleopatra_1963", "sentiment": "Heroic", "era": "Egyptian Period",
             "notes": "Rex Harrison's charming, witty romantic lead"},
            {"media_id": "hbo_rome", "sentiment": "Complex", "era": "Civil War",
             "notes": "Brilliant but ruthless, shown with human flaws"},
            {"media_id": "ac_origins", "sentiment": "Villainous", "era": "Egyptian Period",
             "notes": "Allied with the Order of the Ancients conspiracy"},
        ],
        "analysis": "Caesar remains history's most debated figure. Was he a visionary reformer or a tyrant who destroyed the Republic? Modern works tend toward complexity, but AC Origins notably makes him a straightforward villain."
    },
]


class BridgeToEmpireIngestor:
    """Handles the Bridge to Empire expansion."""

    def __init__(self, uri: str, username: str, password: str):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        self.driver.close()

    def setup_extended_schema(self):
        """Add new schema elements for ConflictNodes and interactions."""
        statements = [
            "CREATE CONSTRAINT conflict_unique IF NOT EXISTS FOR (c:ConflictNode) REQUIRE c.conflict_id IS UNIQUE",
        ]
        with self.driver.session() as session:
            for stmt in statements:
                try:
                    session.run(stmt)
                except Exception as e:
                    log_error("Extended schema", e)
        print("Extended schema applied.")

    def ingest_figures(self, figures: list[HistoricalFigure]) -> int:
        success = 0
        with self.driver.session() as session:
            for fig in figures:
                try:
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name, f.birth_year = $birth_year,
                            f.death_year = $death_year, f.title = $title, f.era = $era
                    """, **fig.model_dump())
                    success += 1
                except Exception as e:
                    log_error(f"Ingesting {fig.name}", e)
        print(f"Ingested {success}/{len(figures)} figures.")
        return success

    def ingest_media(self, works: list[MediaWork]) -> int:
        success = 0
        with self.driver.session() as session:
            for work in works:
                try:
                    session.run("""
                        MERGE (m:MediaWork {media_id: $media_id})
                        SET m.title = $title, m.media_type = $media_type,
                            m.release_year = $release_year, m.creator = $creator
                    """, media_type=work.media_type.value, **work.model_dump(exclude={'media_type'}))
                    success += 1
                except Exception as e:
                    log_error(f"Ingesting {work.title}", e)
        print(f"Ingested {success}/{len(works)} media works.")
        return success

    def ingest_portrayals(self, portrayals: list[Portrayal]) -> int:
        success = 0
        with self.driver.session() as session:
            for p in portrayals:
                try:
                    session.run("""
                        MATCH (f:HistoricalFigure {canonical_id: $figure_id})
                        MATCH (m:MediaWork {media_id: $media_id})
                        MERGE (f)-[r:APPEARS_IN]->(m)
                        SET r.sentiment = $sentiment, r.role_description = $role_description,
                            r.is_protagonist = $is_protagonist, r.conflict_flag = $conflict_flag,
                            r.conflict_notes = $conflict_notes
                    """, sentiment=p.sentiment.value, **p.model_dump(exclude={'sentiment'}))
                    success += 1
                except Exception as e:
                    log_error(f"Portrayal {p.figure_id} in {p.media_id}", e)
        print(f"Ingested {success}/{len(portrayals)} portrayals.")
        return success

    def add_anachronisms(self, anachronisms: dict):
        """Add scholarly critique data to MediaWork nodes."""
        with self.driver.session() as session:
            for media_id, data in anachronisms.items():
                try:
                    session.run("""
                        MATCH (m:MediaWork {media_id: $media_id})
                        SET m.scholarly_source = $source,
                            m.historical_inaccuracies = $inaccuracies
                    """, media_id=media_id, source=data["source"],
                        inaccuracies=data["inaccuracies"])
                except Exception as e:
                    log_error(f"Anachronisms for {media_id}", e)
        print(f"Added anachronism data to {len(anachronisms)} media works.")

    def add_interactions(self, interactions: list):
        """Create INTERACTED_WITH relationships."""
        success = 0
        with self.driver.session() as session:
            for fig1, fig2, context in interactions:
                try:
                    session.run("""
                        MATCH (a:HistoricalFigure {canonical_id: $fig1})
                        MATCH (b:HistoricalFigure {canonical_id: $fig2})
                        MERGE (a)-[r:INTERACTED_WITH]->(b)
                        SET r.context = $context
                    """, fig1=fig1, fig2=fig2, context=context)
                    success += 1
                except Exception as e:
                    log_error(f"Interaction {fig1}-{fig2}", e)
        print(f"Created {success}/{len(interactions)} INTERACTED_WITH relationships.")
        return success

    def create_conflict_nodes(self, conflicts: list):
        """Create ConflictNode entities for cross-era characterization."""
        success = 0
        with self.driver.session() as session:
            for c in conflicts:
                try:
                    # Create the conflict node
                    session.run("""
                        MERGE (cn:ConflictNode {conflict_id: $conflict_id})
                        SET cn.figure_id = $figure_id,
                            cn.conflict_type = $conflict_type,
                            cn.description = $description,
                            cn.analysis = $analysis
                    """, conflict_id=c["conflict_id"], figure_id=c["figure_id"],
                        conflict_type=c["conflict_type"], description=c["description"],
                        analysis=c["analysis"])

                    # Link to the historical figure
                    session.run("""
                        MATCH (f:HistoricalFigure {canonical_id: $figure_id})
                        MATCH (cn:ConflictNode {conflict_id: $conflict_id})
                        MERGE (f)-[:HAS_CONFLICT]->(cn)
                    """, figure_id=c["figure_id"], conflict_id=c["conflict_id"])

                    # Link to each portrayal's media work
                    for p in c["portrayals"]:
                        session.run("""
                            MATCH (cn:ConflictNode {conflict_id: $conflict_id})
                            MATCH (m:MediaWork {media_id: $media_id})
                            MERGE (cn)-[r:DOCUMENTED_IN]->(m)
                            SET r.sentiment = $sentiment, r.era = $era, r.notes = $notes
                        """, conflict_id=c["conflict_id"], media_id=p["media_id"],
                            sentiment=p["sentiment"], era=p["era"], notes=p["notes"])

                    success += 1
                except Exception as e:
                    log_error(f"ConflictNode {c['conflict_id']}", e)
        print(f"Created {success}/{len(conflicts)} ConflictNodes.")
        return success

    def find_cross_era_figures(self) -> list:
        """Find figures appearing in both Republic and Empire era works."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork)
                WITH f, collect(DISTINCT m.title) AS works, collect(DISTINCT m.media_id) AS work_ids
                WHERE size(works) >= 2
                AND (any(w IN work_ids WHERE w IN ['hbo_rome', 'ac_origins', 'republic_of_rome',
                    'masters_of_rome', 'spartacus_1960', 'spartacus_starz', 'cicero_trilogy', 'cleopatra_1963'])
                AND any(w IN work_ids WHERE w IN ['i_claudius_novel', 'i_claudius_bbc']))
                RETURN f.name AS figure, f.canonical_id AS id, works
                ORDER BY size(works) DESC
            """)
            return [dict(r) for r in result]

    def get_stats(self) -> dict:
        with self.driver.session() as session:
            figures = session.run("MATCH (f:HistoricalFigure) RETURN count(f) as c").single()["c"]
            media = session.run("MATCH (m:MediaWork) RETURN count(m) as c").single()["c"]
            portrayals = session.run("MATCH ()-[r:APPEARS_IN]->() RETURN count(r) as c").single()["c"]
            interactions = session.run("MATCH ()-[r:INTERACTED_WITH]->() RETURN count(r) as c").single()["c"]
            conflicts = session.run("MATCH (c:ConflictNode) RETURN count(c) as c").single()["c"]
            return {
                "figures": figures, "media": media, "portrayals": portrayals,
                "interactions": interactions, "conflict_nodes": conflicts
            }


def generate_empire_report(stats: dict, cross_era: list, conflicts: list) -> str:
    """Generate the Bridge to Empire report."""
    report = []
    report.append("# ChronosGraph: Bridge to Empire Report")
    report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    report.append("\n## Database Statistics")
    report.append(f"- **Historical Figures:** {stats['figures']}")
    report.append(f"- **Media Works:** {stats['media']}")
    report.append(f"- **Portrayals:** {stats['portrayals']}")
    report.append(f"- **Social Connections (INTERACTED_WITH):** {stats['interactions']}")
    report.append(f"- **Conflict Nodes:** {stats['conflict_nodes']}")

    report.append("\n---")
    report.append("\n## Cross-Era Figures (Republic → Empire)")
    report.append("\nThese figures appear in both Fall of Republic AND Early Empire works:\n")
    for f in cross_era:
        report.append(f"### {f['figure']}")
        report.append(f"Appears in: {', '.join(f['works'])}\n")

    report.append("\n---")
    report.append("\n## Characterization Conflicts")
    for c in conflicts:
        report.append(f"\n### {c['description']}")
        report.append(f"**Figure:** {c['figure_id']}")
        report.append(f"**Type:** {c['conflict_type']}\n")
        for p in c["portrayals"]:
            report.append(f"- **{p['media_id']}** ({p['era']}): {p['sentiment']} - {p['notes']}")
        report.append(f"\n**Analysis:** {c['analysis']}")

    report.append("\n---")
    report.append("\n## Anachronisms from Scholarly Review")

    report.append("\n### HBO Rome")
    report.append("*Sources: Dr. Roel Konijnendijk, Dr. Michael Taylor, Archaeology Magazine*\n")
    for inac in ANACHRONISMS["hbo_rome"]["inaccuracies"]:
        report.append(f"- {inac}")

    report.append("\n### Assassin's Creed Origins")
    report.append("*Sources: Harvard Egyptologist Peter Der Manuelian, Dr. Chris Naunton*\n")
    for inac in ANACHRONISMS["ac_origins"]["inaccuracies"]:
        report.append(f"- {inac}")

    if ERROR_LOG:
        report.append("\n---")
        report.append("\n## Errors")
        for e in ERROR_LOG:
            report.append(f"- {e['context']}: {e['error']}")

    return "\n".join(report)


def main():
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found")

    print("=" * 70)
    print("ChronosGraph: Bridge to Empire")
    print("=" * 70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    ingestor = BridgeToEmpireIngestor(uri, username, password)

    try:
        print("\n[1/8] Setting up extended schema...")
        ingestor.setup_extended_schema()

        print("\n[2/8] Ingesting new historical figures...")
        ingestor.ingest_figures(NEW_HISTORICAL_FIGURES)

        print("\n[3/8] Ingesting new media works...")
        ingestor.ingest_media(NEW_MEDIA_WORKS)

        print("\n[4/8] Ingesting I, Claudius (Novel) portrayals...")
        ingestor.ingest_portrayals(I_CLAUDIUS_NOVEL_PORTRAYALS)

        print("\n[5/8] Ingesting I, Claudius (BBC) portrayals...")
        ingestor.ingest_portrayals(I_CLAUDIUS_BBC_PORTRAYALS)

        print("\n[6/8] Ingesting Cleopatra (1963) portrayals...")
        ingestor.ingest_portrayals(CLEOPATRA_1963_PORTRAYALS)

        print("\n[7/8] Adding anachronism data from scholars...")
        ingestor.add_anachronisms(ANACHRONISMS)

        print("\n[8/8] Creating social connections and conflict nodes...")
        ingestor.add_interactions(INTERACTIONS)
        ingestor.create_conflict_nodes(CONFLICT_NODES)

        print("\n" + "=" * 70)
        print("ANALYSIS")
        print("=" * 70)

        stats = ingestor.get_stats()
        cross_era = ingestor.find_cross_era_figures()

        print(f"\nDatabase now contains:")
        print(f"  - {stats['figures']} historical figures")
        print(f"  - {stats['media']} media works")
        print(f"  - {stats['portrayals']} portrayals")
        print(f"  - {stats['interactions']} social connections")
        print(f"  - {stats['conflict_nodes']} conflict nodes")

        print(f"\nCross-Era Figures (Republic → Empire): {len(cross_era)}")
        for f in cross_era[:5]:
            print(f"  - {f['figure']}")

        # Generate report
        report = generate_empire_report(stats, cross_era, CONFLICT_NODES)
        report_path = os.path.join(os.path.dirname(__file__), "bridge_to_empire_report.md")
        with open(report_path, "w") as f:
            f.write(report)
        print(f"\nReport saved to: {report_path}")

        print("\n" + "=" * 70)
        print("BRIDGE TO EMPIRE COMPLETE")
        print("=" * 70)

    finally:
        ingestor.close()


if __name__ == "__main__":
    main()
