"""
ChronosGraph: Fall of the Republic - Deep Extraction

Comprehensive ingestion of historical figures from the Fall of the Roman Republic era.
Sources:
- HBO Rome (TV Series, 2005-2007)
- Assassin's Creed Origins (Video Game, 2017)
- The Republic of Rome (Board Game, 1990)
- Masters of Rome (Book Series, 1990-2007) by Colleen McCullough
- Spartacus (Film, 1960) by Stanley Kubrick
- Plutarch's Parallel Lives (Ancient Text, c. 100 CE)
- Cicero Trilogy (Book Series, 2006-2015) by Robert Harris
- Spartacus (TV Series, 2010-2013) by Starz

Implements Master Entity Resolution and Consensus Engine for conflict detection.
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

# Error logging for self-correction
ERROR_LOG = []

def log_error(context: str, error: Exception):
    """Log errors for overnight report."""
    ERROR_LOG.append({
        "timestamp": datetime.now().isoformat(),
        "context": context,
        "error": str(error),
        "traceback": traceback.format_exc()
    })
    print(f"  [ERROR] {context}: {error}")


# =============================================================================
# HISTORICAL FIGURES: Master Entities (Deep Extraction)
# =============================================================================

HISTORICAL_FIGURES = [
    # === Major Political Figures ===
    HistoricalFigure(
        canonical_id="julius_caesar",
        name="Julius Caesar",
        birth_year=-100,
        death_year=-44,
        title="Dictator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="pompey_magnus",
        name="Pompey the Great",
        birth_year=-106,
        death_year=-48,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_antonius",
        name="Mark Antony",
        birth_year=-83,
        death_year=-30,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="octavian_augustus",
        name="Octavian (Augustus)",
        birth_year=-63,
        death_year=14,
        title="First Roman Emperor",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="marcus_crassus",
        name="Marcus Licinius Crassus",
        birth_year=-115,
        death_year=-53,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cicero",
        name="Marcus Tullius Cicero",
        birth_year=-106,
        death_year=-43,
        title="Consul and Orator",
        era="Roman Republic"
    ),

    # === Conspirators and Senators ===
    HistoricalFigure(
        canonical_id="marcus_brutus",
        name="Marcus Junius Brutus",
        birth_year=-85,
        death_year=-42,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="gaius_cassius",
        name="Gaius Cassius Longinus",
        birth_year=-85,
        death_year=-42,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="decimus_brutus",
        name="Decimus Junius Brutus Albinus",
        birth_year=-81,
        death_year=-43,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cato_younger",
        name="Cato the Younger",
        birth_year=-95,
        death_year=-46,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cato_elder",
        name="Cato the Elder",
        birth_year=-234,
        death_year=-149,
        title="Consul and Censor",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="casca",
        name="Publius Servilius Casca",
        birth_year=-84,
        death_year=-42,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cimber",
        name="Lucius Tillius Cimber",
        birth_year=None,
        death_year=-42,
        title="Senator of Rome",
        era="Roman Republic"
    ),

    # === Egyptian Rulers ===
    HistoricalFigure(
        canonical_id="cleopatra_vii",
        name="Cleopatra VII",
        birth_year=-69,
        death_year=-30,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="ptolemy_xiii",
        name="Ptolemy XIII",
        birth_year=-62,
        death_year=-47,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="ptolemy_xii",
        name="Ptolemy XII Auletes",
        birth_year=-117,
        death_year=-51,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="caesarion",
        name="Caesarion (Ptolemy XV)",
        birth_year=-47,
        death_year=-30,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),

    # === Earlier Republic Figures ===
    HistoricalFigure(
        canonical_id="gaius_marius",
        name="Gaius Marius",
        birth_year=-157,
        death_year=-86,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="sulla",
        name="Lucius Cornelius Sulla",
        birth_year=-138,
        death_year=-78,
        title="Dictator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="spartacus",
        name="Spartacus",
        birth_year=-111,
        death_year=-71,
        title="Gladiator and Rebel Leader",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="crixus",
        name="Crixus",
        birth_year=None,
        death_year=-72,
        title="Gladiator and Rebel Leader",
        era="Roman Republic"
    ),

    # === Triumvirs and Associates ===
    HistoricalFigure(
        canonical_id="lepidus",
        name="Marcus Aemilius Lepidus",
        birth_year=-89,
        death_year=-13,
        title="Pontifex Maximus",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_agrippa",
        name="Marcus Vipsanius Agrippa",
        birth_year=-63,
        death_year=-12,
        title="Roman General and Statesman",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="gaius_maecenas",
        name="Gaius Maecenas",
        birth_year=-70,
        death_year=-8,
        title="Patron of the Arts",
        era="Roman Republic/Empire"
    ),

    # === Women of Rome ===
    HistoricalFigure(
        canonical_id="atia_balba",
        name="Atia Balba Caesonia",
        birth_year=-85,
        death_year=-43,
        title="Mother of Augustus",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="servilia",
        name="Servilia of the Junii",
        birth_year=-100,
        death_year=-42,
        title="Roman Noblewoman",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="octavia_minor",
        name="Octavia Minor",
        birth_year=-69,
        death_year=-11,
        title="Sister of Augustus",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="calpurnia",
        name="Calpurnia Pisonis",
        birth_year=-75,
        death_year=None,
        title="Wife of Julius Caesar",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cornelia_cinna",
        name="Cornelia Cinna",
        birth_year=-97,
        death_year=-69,
        title="First Wife of Julius Caesar",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="julia_caesaris",
        name="Julia (daughter of Caesar)",
        birth_year=-76,
        death_year=-54,
        title="Daughter of Caesar, Wife of Pompey",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="livia_drusilla",
        name="Livia Drusilla",
        birth_year=-58,
        death_year=29,
        title="Empress of Rome",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="terentia",
        name="Terentia",
        birth_year=-98,
        death_year=-4,
        title="Wife of Cicero",
        era="Roman Republic"
    ),

    # === Egyptian Court ===
    HistoricalFigure(
        canonical_id="pothinus",
        name="Pothinus",
        birth_year=None,
        death_year=-48,
        title="Regent of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="theodotus",
        name="Theodotus of Chios",
        birth_year=None,
        death_year=-43,
        title="Tutor of Ptolemy XIII",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="achillas",
        name="Achillas",
        birth_year=None,
        death_year=-47,
        title="Egyptian General",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="apollodorus",
        name="Apollodorus the Sicilian",
        birth_year=None,
        death_year=-47,
        title="Servant of Cleopatra",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="pasherenptah",
        name="Pasherenptah III",
        birth_year=-90,
        death_year=-41,
        title="High Priest of Ptah",
        era="Ptolemaic Egypt"
    ),

    # === Gallic Figures ===
    HistoricalFigure(
        canonical_id="vercingetorix",
        name="Vercingetorix",
        birth_year=-82,
        death_year=-46,
        title="King of the Arverni",
        era="Gallic Wars"
    ),

    # === Earlier Statesmen ===
    HistoricalFigure(
        canonical_id="scipio_africanus",
        name="Scipio Africanus",
        birth_year=-236,
        death_year=-183,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="scipio_nasica",
        name="Scipio Nasica Serapio",
        birth_year=None,
        death_year=-132,
        title="Pontifex Maximus",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="tiberius_gracchus",
        name="Tiberius Gracchus",
        birth_year=-163,
        death_year=-133,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="gaius_gracchus",
        name="Gaius Gracchus",
        birth_year=-154,
        death_year=-121,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="lucullus",
        name="Lucius Licinius Lucullus",
        birth_year=-118,
        death_year=-57,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="sertorius",
        name="Quintus Sertorius",
        birth_year=-123,
        death_year=-73,
        title="Roman General",
        era="Roman Republic"
    ),

    # === Generals and Military Figures ===
    HistoricalFigure(
        canonical_id="labienus",
        name="Titus Labienus",
        birth_year=-100,
        death_year=-45,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="lucius_septimius",
        name="Lucius Septimius",
        birth_year=None,
        death_year=-44,
        title="Roman Tribune",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="publius_glabrus",
        name="Marcus Publius Glabrus",
        birth_year=None,
        death_year=None,
        title="Roman Praetor",
        era="Roman Republic"
    ),

    # === Political Figures ===
    HistoricalFigure(
        canonical_id="clodius",
        name="Publius Clodius Pulcher",
        birth_year=-93,
        death_year=-52,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="milo",
        name="Titus Annius Milo",
        birth_year=-95,
        death_year=-48,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="bibulus",
        name="Marcus Calpurnius Bibulus",
        birth_year=-102,
        death_year=-48,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="hortensius",
        name="Quintus Hortensius Hortalus",
        birth_year=-114,
        death_year=-50,
        title="Orator and Consul",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="gaius_verres",
        name="Gaius Verres",
        birth_year=-120,
        death_year=-43,
        title="Roman Magistrate",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="catiline",
        name="Lucius Sergius Catilina",
        birth_year=-108,
        death_year=-62,
        title="Roman Senator",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="gaius_trebonius",
        name="Gaius Trebonius",
        birth_year=-92,
        death_year=-43,
        title="Consul of Rome",
        era="Roman Republic"
    ),

    # === Gladiators and Slaves ===
    HistoricalFigure(
        canonical_id="lucius_vorenus",
        name="Lucius Vorenus",
        birth_year=None,
        death_year=None,
        title="Roman Centurion",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="titus_pullo",
        name="Titus Pullo",
        birth_year=None,
        death_year=None,
        title="Roman Legionary",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="batiatus",
        name="Lentulus Batiatus",
        birth_year=None,
        death_year=-73,
        title="Lanista (Gladiator Trainer)",
        era="Roman Republic"
    ),

    # === Foreign Kings ===
    HistoricalFigure(
        canonical_id="mithridates_vi",
        name="Mithridates VI of Pontus",
        birth_year=-135,
        death_year=-63,
        title="King of Pontus",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="jugurtha",
        name="Jugurtha",
        birth_year=-160,
        death_year=-104,
        title="King of Numidia",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="herod_great",
        name="Herod the Great",
        birth_year=-72,
        death_year=-4,
        title="King of Judea",
        era="Roman Republic/Empire"
    ),

    # === Secretaries and Associates ===
    HistoricalFigure(
        canonical_id="tiro",
        name="Marcus Tullius Tiro",
        birth_year=-103,
        death_year=-4,
        title="Secretary of Cicero",
        era="Roman Republic"
    ),

    # === Republic of Rome Board Game Senators ===
    HistoricalFigure(
        canonical_id="aemilius_paullus",
        name="Lucius Aemilius Paullus",
        birth_year=-229,
        death_year=-160,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="flamininus",
        name="Titus Quinctius Flamininus",
        birth_year=-228,
        death_year=-174,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="fabius_maximus",
        name="Quintus Fabius Maximus",
        birth_year=-280,
        death_year=-203,
        title="Dictator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_claudius_marcellus",
        name="Marcus Claudius Marcellus",
        birth_year=-268,
        death_year=-208,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="rutilius_rufus",
        name="Publius Rutilius Rufus",
        birth_year=-158,
        death_year=-78,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_scaurus",
        name="Marcus Aemilius Scaurus",
        birth_year=-163,
        death_year=-89,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_drusus",
        name="Marcus Livius Drusus",
        birth_year=-124,
        death_year=-91,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="saturninus",
        name="Lucius Appuleius Saturninus",
        birth_year=-138,
        death_year=-100,
        title="Tribune of the Plebs",
        era="Roman Republic"
    ),

    # === Greek Figures (from Plutarch) ===
    HistoricalFigure(
        canonical_id="alexander_great",
        name="Alexander the Great",
        birth_year=-356,
        death_year=-323,
        title="King of Macedon",
        era="Hellenistic"
    ),
    HistoricalFigure(
        canonical_id="demosthenes",
        name="Demosthenes",
        birth_year=-384,
        death_year=-322,
        title="Athenian Orator",
        era="Classical Greece"
    ),
]


# =============================================================================
# MEDIA WORKS: Full Metadata
# =============================================================================

MEDIA_WORKS = [
    # === Original Three ===
    MediaWork(
        media_id="hbo_rome",
        title="Rome",
        media_type=MediaType.TV_SERIES,
        release_year=2005,
        creator="Bruno Heller, John Milius, William J. MacDonald"
    ),
    MediaWork(
        media_id="ac_origins",
        title="Assassin's Creed Origins",
        media_type=MediaType.GAME,
        release_year=2017,
        creator="Ubisoft Montreal"
    ),
    MediaWork(
        media_id="republic_of_rome",
        title="The Republic of Rome",
        media_type=MediaType.GAME,
        release_year=1990,
        creator="Richard Berg, Don Greenwood, Robert Haines (Avalon Hill)"
    ),

    # === New Additions ===
    MediaWork(
        media_id="masters_of_rome",
        title="Masters of Rome",
        media_type=MediaType.BOOK,
        release_year=1990,
        creator="Colleen McCullough"
    ),
    MediaWork(
        media_id="spartacus_1960",
        title="Spartacus",
        media_type=MediaType.FILM,
        release_year=1960,
        creator="Stanley Kubrick"
    ),
    MediaWork(
        media_id="plutarch_lives",
        title="Parallel Lives",
        media_type=MediaType.BOOK,
        release_year=100,  # CE
        creator="Plutarch"
    ),
    MediaWork(
        media_id="cicero_trilogy",
        title="Cicero Trilogy (Imperium, Conspirata, Dictator)",
        media_type=MediaType.BOOK,
        release_year=2006,
        creator="Robert Harris"
    ),
    MediaWork(
        media_id="spartacus_starz",
        title="Spartacus",
        media_type=MediaType.TV_SERIES,
        release_year=2010,
        creator="Steven S. DeKnight (Starz)"
    ),
]


# =============================================================================
# PORTRAYALS: Comprehensive Sentiment Analysis
# =============================================================================

PORTRAYALS = [
    # =========================================================================
    # HBO ROME (Deep Extraction - 40 historical characters)
    # =========================================================================
    Portrayal(
        figure_id="julius_caesar",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Ambitious general and dictator, portrayed as brilliant but ruthless political mastermind",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="HBO Rome: Complex antihero vs AC Origins: Villainous Order ally"
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Caesar's rival, shown as proud traditionalist defending the Republic",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Loyal soldier turned leader, passionate, impulsive, and hedonistic",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Cunning queen using alliances for Egypt's survival",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Cold, calculating heir who becomes ruthless ruler",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="HBO Rome: Coldly villainous vs AC Origins: Heroic legitimate heir"
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Conflicted idealist torn between loyalty and principle",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Stubborn defender of the Republic, extreme traditionalist",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Pragmatic orator navigating political chaos",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="HBO Rome: Pragmatic survivor vs Cicero Trilogy: Noble hero of the Republic"
    ),
    Portrayal(
        figure_id="atia_balba",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Cheerfully amoral and opportunistic manipulator",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="HBO Rome portrays Atia as scheming villainess; historically she was considered virtuous"
    ),
    Portrayal(
        figure_id="servilia",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Vengeful noblewoman manipulating events against Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavia_minor",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Noble sister of Octavian, caught in political machinations",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_cassius",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Conspirator against Caesar, motivated by envy",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="casca",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Conspirator, first to strike Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cimber",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Conspirator who signals the assassination",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lepidus",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Third member of the Second Triumvirate",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_agrippa",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Loyal general and friend to Octavian",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_maecenas",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Advisor and patron of the arts",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="calpurnia",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Devoted wife of Caesar who warns of his death",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="vercingetorix",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Gallic king defeated by Caesar, shown in triumph",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="caesarion",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Son of Caesar and Cleopatra",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pothinus",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Scheming Egyptian regent",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="theodotus",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Tutor who advised Pompey's murder",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="ptolemy_xiii",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Boy-king manipulated by advisors",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="achillas",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Egyptian general who killed Pompey",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lucius_vorenus",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Honorable centurion, protagonist of the series",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="titus_pullo",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Impulsive legionary with a good heart",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="livia_drusilla",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Future empress, shown as intelligent and ambitious",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="herod_great",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Client king seeking Roman favor",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lucius_septimius",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Roman officer who killed Pompey",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # ASSASSIN'S CREED ORIGINS (Deep Extraction)
    # =========================================================================
    Portrayal(
        figure_id="julius_caesar",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Antagonist allied with the Order of the Ancients",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="AC Origins: Villainous Order ally vs HBO Rome: Complex antihero"
    ),
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="ac_origins",
        sentiment=Sentiment.COMPLEX,
        role_description="Initially ally, later revealed as Order collaborator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="ptolemy_xiii",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Puppet pharaoh controlled by the Order",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="ac_origins",
        sentiment=Sentiment.NEUTRAL,
        role_description="Defeated general who flees to Egypt",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="ac_origins",
        sentiment=Sentiment.HEROIC,
        role_description="Legitimate heir bringing order to Rome",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="AC Origins: Heroic heir vs HBO Rome: Cold and villainous"
    ),
    Portrayal(
        figure_id="pothinus",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Order of the Ancients member, regent controlling Ptolemy",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lucius_septimius",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="The Jackal - Order member who killed Pompey and Khemu",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="apollodorus",
        media_id="ac_origins",
        sentiment=Sentiment.HEROIC,
        role_description="Loyal friend to Cleopatra, ally of the Hidden Ones",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pasherenptah",
        media_id="ac_origins",
        sentiment=Sentiment.HEROIC,
        role_description="High Priest of Ptah, ally in Memphis",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # REPUBLIC OF ROME BOARD GAME (Deep Extraction)
    # =========================================================================
    Portrayal(
        figure_id="julius_caesar",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Highest combined Military/Oratory rating statesman card",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with strong military capability",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card known for wealth mechanics",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with 6 Oratory rating",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with 6 Oratory, conservative faction",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_elder",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with 6 Oratory, triggers loyalty mechanics",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_marius",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Early era statesman with military reforms",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sulla",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with dictator mechanics",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Late Republic era senator card",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="scipio_africanus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Negates Punic War Disaster/Stalemates",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="flamininus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Statesman who opposes Cato the Elder",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="aemilius_paullus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator with military capabilities",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="fabius_maximus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="The Delayer - defensive strategy card",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_claudius_marcellus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator with strong military rating",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # MASTERS OF ROME (Colleen McCullough)
    # =========================================================================
    Portrayal(
        figure_id="gaius_marius",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist of first novel, military reformer who rose from obscurity",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Masters of Rome: Heroic protagonist vs Board games: Neutral game piece"
    ),
    Portrayal(
        figure_id="sulla",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Complex antagonist who becomes dictator, shown with psychological depth",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Masters of Rome: Complex villain vs Republic of Rome: Neutral statesman"
    ),
    Portrayal(
        figure_id="julius_caesar",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Central protagonist across multiple books, brilliant and charismatic",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Masters of Rome: Brilliant hero vs AC Origins: Villainous antagonist"
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Vain but capable general, shown as jealous of Caesar",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Richest man in Rome, politically ambitious but militarily inept",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Brilliant orator but politically vacillating",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Son of Servilia, conflicted about loyalty to Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Intelligent queen, political partner to Caesar and Antony",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Loyal to Caesar but shown as increasingly reckless",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Young heir who proves politically brilliant",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="servilia",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Caesar's lover and mother of Brutus",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Stubborn idealist, often shown as political fanatic",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="vercingetorix",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Noble Gallic king who unites tribes against Rome",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="spartacus",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Slave rebel leader mentioned in Crassus storyline",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="mithridates_vi",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Cunning eastern king who challenged Rome for decades",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="clodius",
        media_id="masters_of_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Ambitious playboy and political agitator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="bibulus",
        media_id="masters_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Caesar's co-consul who opposed him",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="rutilius_rufus",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Narrator figure, honorable statesman wrongly exiled",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_scaurus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Princeps Senatus, political operator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="jugurtha",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Numibian king who challenged Rome through bribery",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_drusus",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Reformer who sought to extend citizenship",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sertorius",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Brilliant general who defied Sulla from Spain",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lucullus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Capable general who fought Mithridates",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="tiberius_gracchus",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Reformer martyred for land redistribution",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_gracchus",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Reformer who continued brother's work",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="saturninus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Populist tribune allied with Marius",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_cassius",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Conspirator who recruited Brutus",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="decimus_brutus",
        media_id="masters_of_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Caesar's trusted general who betrayed him",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_trebonius",
        media_id="masters_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Conspirator who detained Antony during assassination",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_agrippa",
        media_id="masters_of_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Loyal friend and general of Octavian",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="caesarion",
        media_id="masters_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Son of Caesar and Cleopatra",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # SPARTACUS (1960 Film - Stanley Kubrick)
    # =========================================================================
    Portrayal(
        figure_id="spartacus",
        media_id="spartacus_1960",
        sentiment=Sentiment.HEROIC,
        role_description="Noble slave leading righteous rebellion against tyranny",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="spartacus_1960",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Ambitious politician who crushes the rebellion",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="Spartacus 1960: Pure villain vs Masters of Rome: Complex but inept"
    ),
    Portrayal(
        figure_id="julius_caesar",
        media_id="spartacus_1960",
        sentiment=Sentiment.NEUTRAL,
        role_description="Young officer, minor supporting role",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="crixus",
        media_id="spartacus_1960",
        sentiment=Sentiment.HEROIC,
        role_description="Gallic gladiator, co-leader of the rebellion",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="batiatus",
        media_id="spartacus_1960",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Slave trader who owned Spartacus",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="publius_glabrus",
        media_id="spartacus_1960",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Roman commander defeated by Spartacus",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # PLUTARCH'S PARALLEL LIVES
    # =========================================================================
    Portrayal(
        figure_id="julius_caesar",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Alexander; shown as ambitious but great",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Agesilaus; great general undone by politics",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Nicias; wealthy but fatally ambitious",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Demosthenes; greatest Roman orator, defender of Republic",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Plutarch: Noble orator/statesman vs HBO Rome: Pragmatic survivor"
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Demetrius; great general ruined by passion",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Dion; noble tyrannicide acting from principle",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Plutarch: Noble liberator vs some modern portrayals as traitor"
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Phocion; incorruptible defender of liberty",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_elder",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Aristides; stern moralist and censor",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_marius",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Pyrrhus; great general corrupted by ambition",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sulla",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Lysander; lucky but cruel dictator",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lucullus",
        media_id="plutarch_lives",
        sentiment=Sentiment.COMPLEX,
        role_description="Paired with Cimon; capable general turned epicurean",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sertorius",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Eumenes; brilliant outcast general",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="tiberius_gracchus",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Agis; reformer martyred for the people",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_gracchus",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Cleomenes; reformer who followed brother's path",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="alexander_great",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Caesar; greatest conqueror of the ancient world",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="demosthenes",
        media_id="plutarch_lives",
        sentiment=Sentiment.HEROIC,
        role_description="Paired with Cicero; greatest Greek orator",
        is_protagonist=True,
        conflict_flag=False
    ),

    # =========================================================================
    # CICERO TRILOGY (Robert Harris)
    # =========================================================================
    Portrayal(
        figure_id="cicero",
        media_id="cicero_trilogy",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - brilliant orator defending the Republic against tyranny",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="Cicero Trilogy: Noble hero vs HBO Rome: Pragmatic trimmer"
    ),
    Portrayal(
        figure_id="tiro",
        media_id="cicero_trilogy",
        sentiment=Sentiment.HEROIC,
        role_description="Narrator - loyal secretary who tells Cicero's story",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="julius_caesar",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Ruthless political rival, brilliant but dangerous",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Vain general, ally then enemy of Cicero",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="cicero_trilogy",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Wealthy schemer backing Catiline",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Political fanatic, ally but difficult",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_verres",
        media_id="cicero_trilogy",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Corrupt governor Cicero prosecutes",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="hortensius",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Rival orator who defends Verres",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="catiline",
        media_id="cicero_trilogy",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Revolutionary conspirator Cicero exposes",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="clodius",
        media_id="cicero_trilogy",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Populist who exiles Cicero",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="milo",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Cicero's violent ally against Clodius",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="cicero_trilogy",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Enemy who orders Cicero's death",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="Cicero Trilogy: Villain who murders Cicero vs HBO Rome: Complex protagonist"
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Young heir who betrays Cicero to Antony",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="cicero_trilogy",
        sentiment=Sentiment.HEROIC,
        role_description="Noble assassin of Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_cassius",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Practical conspirator against Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="terentia",
        media_id="cicero_trilogy",
        sentiment=Sentiment.COMPLEX,
        role_description="Cicero's strong-willed wife and advisor",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lepidus",
        media_id="cicero_trilogy",
        sentiment=Sentiment.NEUTRAL,
        role_description="Third triumvir, minor role",
        is_protagonist=False,
        conflict_flag=False
    ),

    # =========================================================================
    # SPARTACUS (Starz TV Series)
    # =========================================================================
    Portrayal(
        figure_id="spartacus",
        media_id="spartacus_starz",
        sentiment=Sentiment.HEROIC,
        role_description="Thracian gladiator leading slave rebellion, noble freedom fighter",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="spartacus_starz",
        sentiment=Sentiment.COMPLEX,
        role_description="Richest man in Rome, cunning and ruthless but honorable enemy",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="Spartacus Starz: Complex honorable villain vs Spartacus 1960: Pure villain"
    ),
    Portrayal(
        figure_id="julius_caesar",
        media_id="spartacus_starz",
        sentiment=Sentiment.COMPLEX,
        role_description="Wild, unpredictable young officer serving under Crassus",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="Spartacus Starz: Reckless young warrior vs other portrayals as mature statesman"
    ),
    Portrayal(
        figure_id="crixus",
        media_id="spartacus_starz",
        sentiment=Sentiment.HEROIC,
        role_description="Gallic gladiator, Spartacus's rival then ally and co-leader",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="batiatus",
        media_id="spartacus_starz",
        sentiment=Sentiment.COMPLEX,
        role_description="Lanista who owns Spartacus, ambitious and scheming but charismatic",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="publius_glabrus",
        media_id="spartacus_starz",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Praetor Claudius Glaber - responsible for Spartacus's enslavement",
        is_protagonist=False,
        conflict_flag=False
    ),
]


class ChronosGraphIngestor:
    """Handles ingestion of historical fiction data into Neo4j with error recovery."""

    def __init__(self, uri: str, username: str, password: str):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        self.driver.close()

    def setup_schema(self):
        """Apply schema constraints for Master Entity Resolution."""
        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                statement = statement.strip()
                if statement:
                    try:
                        session.run(statement)
                    except Exception as e:
                        log_error("Schema setup", e)
        print("Schema constraints applied.")

    def ingest_figures(self, figures: list[HistoricalFigure]) -> int:
        """Ingest historical figures using MERGE for entity resolution."""
        success_count = 0
        with self.driver.session() as session:
            for figure in figures:
                try:
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name,
                            f.birth_year = $birth_year,
                            f.death_year = $death_year,
                            f.title = $title,
                            f.era = $era
                    """, **figure.model_dump())
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting figure {figure.name}", e)
        print(f"Ingested {success_count}/{len(figures)} historical figures.")
        return success_count

    def ingest_media(self, works: list[MediaWork]) -> int:
        """Ingest media works."""
        success_count = 0
        with self.driver.session() as session:
            for work in works:
                try:
                    session.run("""
                        MERGE (m:MediaWork {media_id: $media_id})
                        SET m.title = $title,
                            m.media_type = $media_type,
                            m.release_year = $release_year,
                            m.creator = $creator
                    """, media_type=work.media_type.value, **work.model_dump(exclude={'media_type'}))
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting media {work.title}", e)
        print(f"Ingested {success_count}/{len(works)} media works.")
        return success_count

    def ingest_portrayals(self, portrayals: list[Portrayal]) -> int:
        """Create APPEARS_IN relationships with sentiment and conflict data."""
        success_count = 0
        with self.driver.session() as session:
            for p in portrayals:
                try:
                    session.run("""
                        MATCH (f:HistoricalFigure {canonical_id: $figure_id})
                        MATCH (m:MediaWork {media_id: $media_id})
                        MERGE (f)-[r:APPEARS_IN]->(m)
                        SET r.sentiment = $sentiment,
                            r.role_description = $role_description,
                            r.is_protagonist = $is_protagonist,
                            r.conflict_flag = $conflict_flag,
                            r.conflict_notes = $conflict_notes
                    """, sentiment=p.sentiment.value, **p.model_dump(exclude={'sentiment'}))
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting portrayal {p.figure_id} in {p.media_id}", e)
        print(f"Ingested {success_count}/{len(portrayals)} portrayals.")
        return success_count

    def find_collisions(self) -> dict:
        """Find historical figures appearing in multiple media works."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WITH f, collect(DISTINCT m.title) AS media_titles, count(DISTINCT m) AS appearance_count
                WHERE appearance_count > 1
                RETURN f.name AS figure,
                       f.canonical_id AS id,
                       media_titles AS appears_in,
                       appearance_count AS collision_count
                ORDER BY collision_count DESC
            """)

            collisions = []
            for record in result:
                collisions.append({
                    "figure": record["figure"],
                    "id": record["id"],
                    "appears_in": record["appears_in"],
                    "collision_count": record["collision_count"]
                })

            conflict_result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WHERE r.conflict_flag = true
                RETURN f.name AS figure,
                       f.canonical_id AS figure_id,
                       m.title AS media,
                       m.media_id AS media_id,
                       r.sentiment AS sentiment,
                       r.conflict_notes AS notes
                ORDER BY f.name
            """)

            conflicts = []
            for record in conflict_result:
                conflicts.append({
                    "figure": record["figure"],
                    "figure_id": record["figure_id"],
                    "media": record["media"],
                    "media_id": record["media_id"],
                    "sentiment": record["sentiment"],
                    "notes": record["notes"]
                })

            return {
                "collisions": collisions,
                "total_collision_figures": len(collisions),
                "conflicts": conflicts,
                "total_conflicts": len(conflicts)
            }

    def get_stats(self) -> dict:
        """Get database statistics."""
        with self.driver.session() as session:
            figures = session.run("MATCH (f:HistoricalFigure) RETURN count(f) as count").single()["count"]
            media = session.run("MATCH (m:MediaWork) RETURN count(m) as count").single()["count"]
            portrayals = session.run("MATCH ()-[r:APPEARS_IN]->() RETURN count(r) as count").single()["count"]
            return {
                "figures": figures,
                "media_works": media,
                "portrayals": portrayals
            }


def generate_overnight_report(results: dict, stats: dict) -> str:
    """Generate the overnight report markdown file."""
    report = []
    report.append("# ChronosGraph Overnight Report")
    report.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("\n## Database Statistics")
    report.append(f"- **Historical Figures:** {stats['figures']}")
    report.append(f"- **Media Works:** {stats['media_works']}")
    report.append(f"- **Portrayals:** {stats['portrayals']}")

    report.append("\n## Collision Summary")
    report.append(f"\n**Total Shared Figures:** {results['total_collision_figures']}")
    report.append("\n| Figure | Appearances | Works |")
    report.append("|--------|-------------|-------|")
    for c in results["collisions"][:20]:  # Top 20
        works = ", ".join(c["appears_in"][:3])
        if len(c["appears_in"]) > 3:
            works += f" (+{len(c['appears_in'])-3} more)"
        report.append(f"| {c['figure']} | {c['collision_count']} | {works} |")

    report.append("\n---")
    report.append("\n## Major Characterization Disagreements")
    report.append(f"\n**Total Conflicts Flagged:** {results['total_conflicts']}")

    # Group conflicts by figure
    conflicts_by_figure = {}
    for c in results["conflicts"]:
        if c["figure"] not in conflicts_by_figure:
            conflicts_by_figure[c["figure"]] = []
        conflicts_by_figure[c["figure"]].append(c)

    for figure, conflicts in sorted(conflicts_by_figure.items()):
        report.append(f"\n### {figure}")
        for c in conflicts:
            report.append(f"\n**{c['media']}** - Sentiment: *{c['sentiment']}*")
            if c["notes"]:
                report.append(f"> {c['notes']}")

    report.append("\n---")
    report.append("\n## Detailed Conflict Analysis")

    # Major disagreements
    major_disagreements = [
        {
            "figure": "Julius Caesar",
            "disagreement": "Hero vs Villain",
            "works": {
                "Masters of Rome": "Heroic protagonist - brilliant, charismatic leader who transforms Rome",
                "HBO Rome": "Complex antihero - brilliant but ruthless, shown with human flaws",
                "AC Origins": "Villainous - allied with the Order of the Ancients conspiracy",
                "Spartacus Starz": "Complex - young, wild warrior under Crassus"
            }
        },
        {
            "figure": "Octavian (Augustus)",
            "disagreement": "Cold villain vs Noble heir",
            "works": {
                "HBO Rome": "Villainous - cold, calculating, emotionally distant manipulator",
                "AC Origins": "Heroic - legitimate heir bringing order and stability to Rome",
                "Cicero Trilogy": "Complex - betrays Cicero despite earlier alliance"
            }
        },
        {
            "figure": "Marcus Tullius Cicero",
            "disagreement": "Noble hero vs Pragmatic survivor",
            "works": {
                "Cicero Trilogy": "Heroic protagonist - defender of the Republic against tyranny",
                "Plutarch's Lives": "Heroic - paired with Demosthenes as greatest Roman orator",
                "HBO Rome": "Neutral/Complex - pragmatic trimmer who survives by bending"
            }
        },
        {
            "figure": "Marcus Brutus",
            "disagreement": "Noble liberator vs Traitor",
            "works": {
                "Plutarch's Lives": "Heroic - noble tyrannicide acting from philosophical principle",
                "Cicero Trilogy": "Heroic - noble assassin defending the Republic",
                "HBO Rome": "Complex - conflicted idealist, shown with doubt and guilt"
            }
        },
        {
            "figure": "Mark Antony",
            "disagreement": "Passionate hero vs Murderous villain",
            "works": {
                "HBO Rome": "Complex protagonist - passionate, loyal, impulsive but sympathetic",
                "Cicero Trilogy": "Villainous - the man who orders Cicero's murder",
                "Plutarch's Lives": "Complex - great general ruined by passion for Cleopatra"
            }
        },
        {
            "figure": "Marcus Crassus",
            "disagreement": "Pure villain vs Complex figure",
            "works": {
                "Spartacus 1960": "Pure villain - symbol of Roman oppression and cruelty",
                "Spartacus Starz": "Complex villain - ruthless but honorable enemy to Spartacus",
                "Masters of Rome": "Complex - rich and ambitious but militarily inept"
            }
        },
        {
            "figure": "Gaius Marius",
            "disagreement": "Hero vs Complex figure",
            "works": {
                "Masters of Rome": "Heroic protagonist - military reformer who rose from nothing",
                "Plutarch's Lives": "Complex - great general corrupted by ambition and cruelty",
                "Republic of Rome": "Neutral - game piece with military stats"
            }
        },
        {
            "figure": "Atia of the Julii",
            "disagreement": "Historical virtue vs Dramatic license",
            "works": {
                "HBO Rome": "Villainous - cheerfully amoral, scheming manipulator",
                "Historical Record": "By ancient accounts, she was considered a virtuous Roman matron"
            }
        }
    ]

    for d in major_disagreements:
        report.append(f"\n### {d['figure']}: {d['disagreement']}")
        report.append("")
        for work, portrayal in d["works"].items():
            report.append(f"- **{work}:** {portrayal}")

    report.append("\n---")
    report.append("\n## Error Log")
    if ERROR_LOG:
        for err in ERROR_LOG:
            report.append(f"\n- **{err['timestamp']}** [{err['context']}]: {err['error']}")
    else:
        report.append("\nNo errors encountered during ingestion.")

    report.append("\n---")
    report.append("\n## Sources")
    report.append("""
- [HBO Rome Wiki - Historical Characters](https://hbo-rome.fandom.com/wiki/Category:Historical_Character)
- [Assassin's Creed Wiki](https://assassinscreed.fandom.com/)
- [Republic of Rome Living Rules](https://www.amarriner.com/ror/RoRRulebookV212.pdf)
- [Masters of Rome - Wikipedia](https://en.wikipedia.org/wiki/Masters_of_Rome)
- [Parallel Lives - Wikipedia](https://en.wikipedia.org/wiki/Parallel_Lives)
- [Cicero Trilogy - Goodreads](https://www.goodreads.com/series/54379-cicero)
- [Spartacus Wiki](https://spartacus.fandom.com/)
""")

    return "\n".join(report)


def main():
    """Run the Fall of the Republic deep extraction."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found in environment variables")

    print("=" * 70)
    print("ChronosGraph: Fall of the Republic - Deep Extraction")
    print("=" * 70)
    print(f"Connecting to: {uri}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        ingestor = ChronosGraphIngestor(uri, username, password)
    except (ServiceUnavailable, AuthError) as e:
        log_error("Database connection", e)
        print("\n[FATAL] Could not connect to Neo4j. Check credentials and try again.")
        sys.exit(1)

    try:
        print("\n[1/5] Setting up schema...")
        ingestor.setup_schema()

        print("\n[2/5] Ingesting historical figures...")
        print(f"       Total figures to ingest: {len(HISTORICAL_FIGURES)}")
        ingestor.ingest_figures(HISTORICAL_FIGURES)

        print("\n[3/5] Ingesting media works...")
        print(f"       Total works to ingest: {len(MEDIA_WORKS)}")
        ingestor.ingest_media(MEDIA_WORKS)

        print("\n[4/5] Ingesting portrayals...")
        print(f"       Total portrayals to ingest: {len(PORTRAYALS)}")
        ingestor.ingest_portrayals(PORTRAYALS)

        print("\n[5/5] Analyzing collisions and conflicts...")
        results = ingestor.find_collisions()
        stats = ingestor.get_stats()

        print("\n" + "=" * 70)
        print("COLLISION ANALYSIS SUMMARY")
        print("=" * 70)
        print(f"\nTotal Figures in Database: {stats['figures']}")
        print(f"Total Media Works: {stats['media_works']}")
        print(f"Total Portrayals: {stats['portrayals']}")
        print(f"\nCollisions (shared figures): {results['total_collision_figures']}")
        print(f"Conflicting Portrayals: {results['total_conflicts']}")

        # Show top collisions
        print("\nTop 10 Most Shared Figures:")
        print("-" * 50)
        for c in results["collisions"][:10]:
            print(f"  {c['figure']}: {c['collision_count']} works")

        # Generate overnight report
        print("\n" + "=" * 70)
        print("Generating overnight_report.md...")
        report_content = generate_overnight_report(results, stats)

        report_path = os.path.join(os.path.dirname(__file__), "overnight_report.md")
        with open(report_path, "w") as f:
            f.write(report_content)
        print(f"Report saved to: {report_path}")

        print("\n" + "=" * 70)
        print("INGESTION COMPLETE")
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)

        if ERROR_LOG:
            print(f"\n[WARNING] {len(ERROR_LOG)} errors occurred. See overnight_report.md for details.")

        return results

    except Exception as e:
        log_error("Main execution", e)
        print(f"\n[ERROR] Unexpected error: {e}")
        raise
    finally:
        ingestor.close()


if __name__ == "__main__":
    main()
