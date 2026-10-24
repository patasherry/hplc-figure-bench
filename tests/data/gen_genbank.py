#!/usr/bin/env python3
import os

GB_DIR = os.path.join(os.path.dirname(__file__), 'gb')
os.makedirs(GB_DIR, exist_ok=True)

SEQ_255 = "MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
SEQ_30 = "MHHHHHHSSGLVPRGSMSSKGEELFTGVVP"

# 1. Complement strand
gb_complement = """LOCUS       pCOMP                 1000 bp    DNA     circular SYN 01-JAN-2025
DEFINITION  Synthetic vector with complement strand CDS.
FEATURES             Location/Qualifiers
     rep_origin      1..80
                     /label="pUC ori"
     CDS             complement(100..864)
                     /label="CompProtein"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
     promoter        complement(880..930)
                     /label="T7 promoter"
     RBS             complement(866..875)
                     /label="RBS"
     CDS             complement(940..990)
                     /label="kanamycin"
ORIGIN
        1 atcg
//"""

# 2. Join (non-origin)
gb_join = """LOCUS       pJOIN                 1000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             join(100..300,400..964)
                     /label="JoinedProtein"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
ORIGIN
        1 atcg
//"""

# 3. Join spanning origin
gb_wrap = """LOCUS       pWRAP                 1000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             join(800..1000,1..564)
                     /label="WrapProtein"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
ORIGIN
        1 atcg
//"""

# 4. Multi-line qualifiers
gb_multiline = """LOCUS       pMULTI                1000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             100..864
                     /label="Multi Line
                     Label"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKF
                     ICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVK
                     FEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLAD
                     HYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
ORIGIN
        1 atcg
//"""

# 5. Lowercase and uppercase sequence
gb_case = """LOCUS       pCASE                 500 bp     DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             1..90
                     /label="TestCDS"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVP"
ORIGIN
        1 atcgATCGat cgATCGatcg ATCGatcgAT CGatcgATCG
       51 atcgATCGat cgATCGatcg ATCGatcgAT CGatcgATCG
//"""

# 6. File without ORIGIN
gb_no_origin = """LOCUS       pNOORIGIN             1000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             100..864
                     /label="NoOrigProtein"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
//"""

# 7. Windows line endings
gb_windows = """LOCUS       pWIN                  1000 bp    DNA     circular SYN 01-JAN-2025\r
FEATURES             Location/Qualifiers\r
     CDS             100..864\r
                     /label="WinProtein"\r
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"\r
ORIGIN\r
        1 atcg\r
//\r
"""

# 8. Feature labels from gene or product fallback
gb_gene_product = """LOCUS       pGENEPROD             1000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     CDS             100..864
                     /gene="nadK"
                     /product="NAD kinase"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
     CDS             880..980
                     /product="beta-lactamase"
                     /translation="MSIQHFRVALIPFFAAFCLPVFAHPETLVKVKDAEDQLGARVGYIELDLNSGKI"
ORIGIN
        1 atcg
//"""

# 9. SnapGene-style .dna export file
snapgene_export = b"\x09SnapGene binary file format sample content\x00\x01\x02"


# 10. Origin-spanning CDS cassette keeps promoter and excludes plasmid features
gb_origin_spanning_cassette = """LOCUS       pORISPAN              5000 bp    DNA     circular SYN 01-JAN-2025
FEATURES             Location/Qualifiers
     promoter        4700..4780
                     /label="T7 promoter"
     CDS             join(4800..5000,1..600)
                     /label="OrispanProtein"
                     /translation="MHHHHHHSSGLVPRGSMSSKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYVQERTIFFKDDGNYKTRAEVKFEGDTLVNRIELKGIDFKEDGNILGHKLEYNYNSHNVYIMADKQKNGIKVNFKIRHNIEDGSVQLADHYQQNTPIGDGPVLLPDNHYLSTQSALSKDPNEKRDHMVLLEFVTAAGITLGMDELYK"
     misc_feature    4805..4822
                     /label="6xHis"
     CDS             2000..2860
                     /label="AmpR"
                     /translation="MSIQHFRVALIPFFAAFCLPVFAHPETLVKVKDAEDQLGARVGYIELDLNSGKI"
     rep_origin      3200..3800
                     /label="ori"
ORIGIN
        1 atcg
//"""

files = {
    'gb_origin_spanning_cassette.gb': gb_origin_spanning_cassette,
    'gb_complement.gb': gb_complement,
    'gb_join.gb': gb_join,
    'gb_wrap.gb': gb_wrap,
    'gb_multiline.gb': gb_multiline,
    'gb_case.gb': gb_case,
    'gb_no_origin.gb': gb_no_origin,
    'gb_windows.gb': gb_windows,
    'gb_gene_product.gb': gb_gene_product,
}

for name, content in files.items():
    with open(os.path.join(GB_DIR, name), 'w', encoding='utf-8', newline='') as f:
        f.write(content)

with open(os.path.join(GB_DIR, 'snapgene_export.dna'), 'wb') as f:
    f.write(snapgene_export)

print("Generated GenBank test fixtures in", GB_DIR)
